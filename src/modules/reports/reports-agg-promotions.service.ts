import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  ReportPeriod, buildKpiCard, periodDays, daysAgoStr, todayStr,
} from './reports-agg.helpers';

export interface PromotionReport {
  kpis: {
    totalPromotions:    ReturnType<typeof buildKpiCard>;
    couponUsageRate:    ReturnType<typeof buildKpiCard>;
    avgDiscountDepth:   ReturnType<typeof buildKpiCard>;
    incrementalRevenue: ReturnType<typeof buildKpiCard>;
  };
  promotionEffectiveness: {
    promotionId: string;
    name: string;
    type: 'coupon' | 'flash_sale' | 'point_reward';
    usageCount: number;
    discountTotal: number;
    incrementalRevenue: number;
    roi: number;
  }[];
  discountByType: { type: string; total: number }[];
  flashSaleConversion: {
    saleId: string;
    name: string;
    viewCount: number;
    orderCount: number;
    conversionRate: number;
    revenue: number;
  }[];
}

@Injectable()
export class ReportsAggPromotionsService {
  constructor(private readonly dataSource: DataSource) {}

  async computePromotions(period: ReportPeriod): Promise<PromotionReport> {
    const days = periodDays(period);
    const today = todayStr();
    const curFrom = daysAgoStr(days);
    const prevFrom = daysAgoStr(days * 2);
    const prevTo = daysAgoStr(days + 1);

    const [totCur, totPrev, couponCur, couponPrev, discDepthRow, incRevRow] = await Promise.all([
      this.dataSource.query<{ cnt: string }[]>(
        `SELECT COUNT(*) AS cnt FROM promotions WHERE status = 'active'
         AND start_date <= ? AND end_date >= ?`,
        [today, curFrom],
      ),
      this.dataSource.query<{ cnt: string }[]>(
        `SELECT COUNT(*) AS cnt FROM promotions WHERE status = 'active'
         AND start_date <= ? AND end_date >= ?`,
        [prevTo, prevFrom],
      ),
      // coupon usage rate = orders that used a coupon / total orders in period
      this.dataSource.query<{ withCoupon: string; totalOrders: string }[]>(`
        SELECT COUNT(DISTINCT pu.order_id) AS withCoupon,
               (SELECT COUNT(*) FROM don_hang
                WHERE DATE(ngay_dat_hang) >= ? AND DATE(ngay_dat_hang) <= ?
                  AND trang_thai_don NOT IN ('DaHuy')) AS totalOrders
        FROM promotion_usage pu
        JOIN promotions p ON p.promotion_id = pu.promotion_id
        WHERE p.is_coupon = 1
          AND DATE(pu.applied_at) >= ? AND DATE(pu.applied_at) <= ?
      `, [curFrom, today, curFrom, today]),
      this.dataSource.query<{ withCoupon: string; totalOrders: string }[]>(`
        SELECT COUNT(DISTINCT pu.order_id) AS withCoupon,
               (SELECT COUNT(*) FROM don_hang
                WHERE DATE(ngay_dat_hang) >= ? AND DATE(ngay_dat_hang) <= ?
                  AND trang_thai_don NOT IN ('DaHuy')) AS totalOrders
        FROM promotion_usage pu
        JOIN promotions p ON p.promotion_id = pu.promotion_id
        WHERE p.is_coupon = 1
          AND DATE(pu.applied_at) >= ? AND DATE(pu.applied_at) <= ?
      `, [prevFrom, prevTo, prevFrom, prevTo]),
      // avg discount depth = avg(discount_total / gmv) per order
      this.dataSource.query<{ depth: string }[]>(`
        SELECT AVG(dh.discount_total / NULLIF(dh.tong_thanh_toan + dh.discount_total, 0) * 100) AS depth
        FROM don_hang dh
        WHERE DATE(dh.ngay_dat_hang) >= ? AND DATE(dh.ngay_dat_hang) <= ?
          AND dh.trang_thai_don NOT IN ('DaHuy') AND dh.discount_total > 0
      `, [curFrom, today]),
      // incremental revenue = total GMV of orders that used any promotion
      this.dataSource.query<{ cur: string; prev: string }[]>(`
        SELECT
          (SELECT COALESCE(SUM(dh.tong_thanh_toan), 0) FROM promotion_usage pu
           JOIN don_hang dh ON dh.don_hang_id = pu.order_id
           WHERE DATE(pu.applied_at) >= ? AND DATE(pu.applied_at) <= ?) AS cur,
          (SELECT COALESCE(SUM(dh.tong_thanh_toan), 0) FROM promotion_usage pu
           JOIN don_hang dh ON dh.don_hang_id = pu.order_id
           WHERE DATE(pu.applied_at) >= ? AND DATE(pu.applied_at) <= ?) AS prev
      `, [curFrom, today, prevFrom, prevTo]),
    ]);

    const curTotal   = Number(totCur[0]?.cnt   ?? 0);
    const prevTotal  = Number(totPrev[0]?.cnt  ?? 0);
    const withCoupon = Number(couponCur[0]?.withCoupon ?? 0);
    const totalOrds  = Number(couponCur[0]?.totalOrders ?? 0);
    const prevWithCoupon = Number(couponPrev[0]?.withCoupon ?? 0);
    const prevTotalOrds  = Number(couponPrev[0]?.totalOrders ?? 0);
    const curCouponRate  = totalOrds > 0 ? (withCoupon / totalOrds) * 100 : 0;
    const prevCouponRate = prevTotalOrds > 0 ? (prevWithCoupon / prevTotalOrds) * 100 : 0;
    const curDepth  = Math.round(Number(discDepthRow[0]?.depth ?? 0) * 10) / 10;
    const curIncRev = Number(incRevRow[0]?.cur  ?? 0);
    const prevIncRev = Number(incRevRow[0]?.prev ?? 0);

    const [couponRows, flashRows, discTypeRows] = await Promise.all([
      this.dataSource.query<{
        promotionId: number; name: string; code: string;
        usageCount: string; discountTotal: string; incrementalRevenue: string;
      }[]>(`
        SELECT p.promotion_id AS promotionId, p.name, p.code,
               COUNT(pu.usage_id) AS usageCount,
               COALESCE(SUM(pu.discount_amount), 0) AS discountTotal,
               COALESCE(SUM(dh.tong_thanh_toan), 0) AS incrementalRevenue
        FROM promotions p
        JOIN promotion_usage pu ON pu.promotion_id = p.promotion_id
        JOIN don_hang dh ON dh.don_hang_id = pu.order_id
        WHERE p.is_coupon = 1
          AND DATE(pu.applied_at) >= ? AND DATE(pu.applied_at) <= ?
        GROUP BY p.promotion_id, p.name, p.code
        ORDER BY discountTotal DESC
        LIMIT 10
      `, [curFrom, today]),

      this.dataSource.query<{
        saleId: number; name: string;
        orderCount: string; revenue: string;
      }[]>(`
        SELECT fs.flash_sale_id AS saleId, fs.ten AS name,
               COUNT(DISTINCT dh.don_hang_id) AS orderCount,
               COALESCE(SUM(ct.thanh_tien), 0) AS revenue
        FROM flash_sale fs
        JOIN flash_sale_item fsi ON fsi.flash_sale_id = fs.flash_sale_id
        JOIN chi_tiet_don_hang ct ON ct.phien_ban_id = fsi.phien_ban_id
        JOIN don_hang dh ON dh.don_hang_id = ct.don_hang_id
        WHERE DATE(dh.ngay_dat_hang) >= ? AND DATE(dh.ngay_dat_hang) <= ?
          AND dh.trang_thai_don NOT IN ('DaHuy')
        GROUP BY fs.flash_sale_id, fs.ten
        ORDER BY revenue DESC
        LIMIT 10
      `, [curFrom, today]),

      this.dataSource.query<{ type: string; total: string }[]>(`
        SELECT p.type, COALESCE(SUM(pu.discount_amount), 0) AS total
        FROM promotion_usage pu
        JOIN promotions p ON p.promotion_id = pu.promotion_id
        WHERE DATE(pu.applied_at) >= ? AND DATE(pu.applied_at) <= ?
        GROUP BY p.type
        ORDER BY total DESC
      `, [curFrom, today]),
    ]);

    const promotionEffectiveness = [
      ...couponRows.map(r => {
        const disc = Number(r.discountTotal);
        const incr = Number(r.incrementalRevenue);
        return {
          promotionId:        String(r.promotionId),
          name:               r.code || r.name,
          type:               'coupon' as const,
          usageCount:         Number(r.usageCount),
          discountTotal:      disc,
          incrementalRevenue: incr,
          roi:                disc > 0 ? Math.round(((incr - disc) / disc) * 100) : 0,
        };
      }),
      ...flashRows.map(r => {
        const incr = Number(r.revenue);
        return {
          promotionId:        String(r.saleId),
          name:               r.name,
          type:               'flash_sale' as const,
          usageCount:         Number(r.orderCount),
          discountTotal:      0,
          incrementalRevenue: incr,
          roi:                0,
        };
      }),
    ];

    const discountByType = [
      ...discTypeRows.map(r => ({ type: r.type, total: Number(r.total) })),
      { type: 'point_reward', total: 0 },
    ];

    const flashSaleConversion = flashRows.map(r => {
      const orderCount = Number(r.orderCount);
      return {
        saleId:         String(r.saleId),
        name:           r.name,
        viewCount:      0,
        orderCount,
        conversionRate: 0,
        revenue:        Number(r.revenue),
      };
    });

    return {
      kpis: {
        totalPromotions:    buildKpiCard('Chiến dịch đang chạy', curTotal, prevTotal, 'count'),
        couponUsageRate:    buildKpiCard('Tỉ lệ dùng mã', curCouponRate, prevCouponRate, 'percent'),
        avgDiscountDepth:   buildKpiCard('Độ sâu giảm giá', curDepth, 0, 'percent'),
        incrementalRevenue: buildKpiCard('Doanh thu từ promo', curIncRev, prevIncRev, 'vnd'),
      },
      promotionEffectiveness,
      discountByType,
      flashSaleConversion,
    };
  }
}
