import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DailyRevenueReport } from './entities/daily-revenue-report.entity';
import {
  ReportPeriod, buildKpiCard, periodDays, daysAgoStr, todayStr,
} from './reports-agg.helpers';

export interface RevenueReport {
  kpis: {
    gmv:           ReturnType<typeof buildKpiCard>;
    netRevenue:    ReturnType<typeof buildKpiCard>;
    avgOrderValue: ReturnType<typeof buildKpiCard>;
    returnRate:    ReturnType<typeof buildKpiCard>;
  };
  gmvSeries:        { date: string; value: number }[];
  netRevenueSeries: { date: string; value: number }[];
  revenueByCategory: { category: string; revenue: number; share: number }[];
  revenueByChannel:  { channel: string; revenue: number }[];
  topCoupons: {
    couponId: string;
    code: string;
    usageCount: number;
    discountTotal: number;
    incrementalRevenue: number;
  }[];
}

@Injectable()
export class ReportsAggRevenueService {
  constructor(
    @InjectRepository(DailyRevenueReport)
    private readonly dailyRepo: Repository<DailyRevenueReport>,
    private readonly dataSource: DataSource,
  ) {}

  async computeRevenue(period: ReportPeriod): Promise<RevenueReport> {
    const days = periodDays(period);
    const today = todayStr();
    const curFrom = daysAgoStr(days);
    const prevFrom = daysAgoStr(days * 2);
    const prevTo = daysAgoStr(days + 1);

    const [curRows, prevRows] = await Promise.all([
      this.dailyRepo
        .createQueryBuilder('r')
        .where('r.date >= :from AND r.date <= :to', { from: curFrom, to: today })
        .orderBy('r.date', 'ASC')
        .getMany(),
      this.dailyRepo
        .createQueryBuilder('r')
        .where('r.date >= :from AND r.date <= :to', { from: prevFrom, to: prevTo })
        .getMany(),
    ]);

    const sum = (rows: DailyRevenueReport[], key: keyof DailyRevenueReport) =>
      rows.reduce((acc, r) => acc + Number(r[key] ?? 0), 0);

    const curGmv    = sum(curRows,  'gmv');
    const prevGmv   = sum(prevRows, 'gmv');
    const curNet    = sum(curRows,  'netRevenue');
    const prevNet   = sum(prevRows, 'netRevenue');
    const curPlaced = sum(curRows,  'ordersPlaced');
    const prevPlaced = sum(prevRows, 'ordersPlaced');
    const curRet    = sum(curRows,  'ordersReturned');
    const prevRet   = sum(prevRows, 'ordersReturned');

    const curAov  = curPlaced  > 0 ? Math.round(curGmv  / curPlaced)  : 0;
    const prevAov = prevPlaced > 0 ? Math.round(prevGmv / prevPlaced) : 0;

    const curRetRate  = curPlaced  > 0 ? (curRet  / curPlaced)  * 100 : 0;
    const prevRetRate = prevPlaced > 0 ? (prevRet / prevPlaced) * 100 : 0;

    const gmvSeries        = curRows.map(r => ({ date: r.date, value: Number(r.gmv) }));
    const netRevenueSeries = curRows.map(r => ({ date: r.date, value: Number(r.netRevenue) }));

    const [catRows, chanRows, couponRows] = await Promise.all([
      this.dataSource.query<{ category: string; revenue: string }[]>(`
        SELECT dc.ten_danh_muc AS category, COALESCE(SUM(ct.thanh_tien), 0) AS revenue
        FROM chi_tiet_don_hang ct
        JOIN don_hang dh ON dh.don_hang_id = ct.don_hang_id
        JOIN phien_ban_san_pham pv ON pv.phien_ban_id = ct.phien_ban_id
        JOIN san_pham sp ON sp.san_pham_id = pv.san_pham_id
        JOIN danh_muc dc ON dc.danh_muc_id = sp.danh_muc_id
        WHERE DATE(dh.ngay_dat_hang) >= ? AND DATE(dh.ngay_dat_hang) <= ?
          AND dh.trang_thai_don = 'DaGiao'
        GROUP BY dc.danh_muc_id, dc.ten_danh_muc
        ORDER BY revenue DESC
      `, [curFrom, today]),

      this.dataSource.query<{ channel: string; revenue: string }[]>(`
        SELECT phuong_thuc_thanh_toan AS channel, COALESCE(SUM(tong_thanh_toan), 0) AS revenue
        FROM don_hang
        WHERE DATE(ngay_dat_hang) >= ? AND DATE(ngay_dat_hang) <= ?
          AND trang_thai_don = 'DaGiao'
        GROUP BY phuong_thuc_thanh_toan
        ORDER BY revenue DESC
      `, [curFrom, today]),

      this.dataSource.query<{
        promotion_id: number; code: string; usageCount: string;
        discountTotal: string; incrementalRevenue: string;
      }[]>(`
        SELECT p.promotion_id, p.code,
               COUNT(pu.usage_id) AS usageCount,
               COALESCE(SUM(pu.discount_amount), 0) AS discountTotal,
               COALESCE(SUM(dh.tong_thanh_toan), 0) AS incrementalRevenue
        FROM promotions p
        JOIN promotion_usage pu ON pu.promotion_id = p.promotion_id
        JOIN don_hang dh ON dh.don_hang_id = pu.order_id
        WHERE p.is_coupon = 1
          AND DATE(pu.applied_at) >= ? AND DATE(pu.applied_at) <= ?
        GROUP BY p.promotion_id, p.code
        ORDER BY discountTotal DESC
        LIMIT 10
      `, [curFrom, today]),
    ]);

    const totalCatRevenue = catRows.reduce((a, r) => a + Number(r.revenue), 0) || 1;
    const revenueByCategory = catRows.map(r => ({
      category: r.category,
      revenue:  Number(r.revenue),
      share:    Math.round((Number(r.revenue) / totalCatRevenue) * 1000) / 10,
    }));

    const revenueByChannel = chanRows.map(r => ({
      channel: r.channel,
      revenue: Number(r.revenue),
    }));

    const topCoupons = couponRows.map(r => ({
      couponId:           String(r.promotion_id),
      code:               r.code,
      usageCount:         Number(r.usageCount),
      discountTotal:      Number(r.discountTotal),
      incrementalRevenue: Number(r.incrementalRevenue),
    }));

    return {
      kpis: {
        gmv:           buildKpiCard('GMV', curGmv, prevGmv, 'vnd'),
        netRevenue:    buildKpiCard('Doanh thu thuần', curNet, prevNet, 'vnd'),
        avgOrderValue: buildKpiCard('AOV', curAov, prevAov, 'vnd'),
        returnRate:    buildKpiCard('Tỉ lệ hoàn trả', curRetRate, prevRetRate, 'percent'),
      },
      gmvSeries,
      netRevenueSeries,
      revenueByCategory,
      revenueByChannel,
      topCoupons,
    };
  }
}
