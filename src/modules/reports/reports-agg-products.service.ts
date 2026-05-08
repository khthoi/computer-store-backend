import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  ReportPeriod, buildKpiCard, periodDays, daysAgoStr, todayStr,
} from './reports-agg.helpers';

export interface ProductPerformanceReport {
  kpis: {
    totalSold:      ReturnType<typeof buildKpiCard>;
    newListings:    ReturnType<typeof buildKpiCard>;
    avgRating:      ReturnType<typeof buildKpiCard>;
    outOfStockRate: ReturnType<typeof buildKpiCard>;
  };
  topByRevenue: {
    productId: string;
    name: string;
    unitsSold: number;
    revenue: number;
    returnRate: number;
    variants: { variantId: string; name: string; unitsSold: number }[];
  }[];
  topByRating: {
    variantId: string;
    productId: string;
    name: string;
    avgRating: number;
    reviewCount: number;
  }[];
  slowMoving: {
    variantId: string;
    productId: string;
    name: string;
    sku: string;
    stock: number;
    daysSinceLastSale: number;
  }[];
  soldByCategory: { category: string; unitsSold: number }[];
}

@Injectable()
export class ReportsAggProductsService {
  constructor(private readonly dataSource: DataSource) {}

  async computeProducts(period: ReportPeriod): Promise<ProductPerformanceReport> {
    const days = periodDays(period);
    const today = todayStr();
    const curFrom = daysAgoStr(days);
    const prevFrom = daysAgoStr(days * 2);
    const prevTo = daysAgoStr(days + 1);

    const [soldCur, soldPrev, newCur, newPrev, ratingRow, stockRows] = await Promise.all([
      this.dataSource.query<{ total: string }[]>(`
        SELECT COALESCE(SUM(ct.so_luong), 0) AS total
        FROM chi_tiet_don_hang ct
        JOIN don_hang dh ON dh.don_hang_id = ct.don_hang_id
        WHERE DATE(dh.ngay_dat_hang) >= ? AND DATE(dh.ngay_dat_hang) <= ?
          AND dh.trang_thai_don = 'DaGiao'
      `, [curFrom, today]),

      this.dataSource.query<{ total: string }[]>(`
        SELECT COALESCE(SUM(ct.so_luong), 0) AS total
        FROM chi_tiet_don_hang ct
        JOIN don_hang dh ON dh.don_hang_id = ct.don_hang_id
        WHERE DATE(dh.ngay_dat_hang) >= ? AND DATE(dh.ngay_dat_hang) <= ?
          AND dh.trang_thai_don = 'DaGiao'
      `, [prevFrom, prevTo]),

      this.dataSource.query<{ cnt: string }[]>(`
        SELECT COUNT(*) AS cnt FROM san_pham
        WHERE DATE(ngay_tao) >= ? AND DATE(ngay_tao) <= ?
      `, [curFrom, today]),

      this.dataSource.query<{ cnt: string }[]>(`
        SELECT COUNT(*) AS cnt FROM san_pham
        WHERE DATE(ngay_tao) >= ? AND DATE(ngay_tao) <= ?
      `, [prevFrom, prevTo]),

      this.dataSource.query<{ avg: string }[]>(`
        SELECT COALESCE(AVG(rating), 0) AS avg
        FROM danh_gia_san_pham
        WHERE review_status = 'Approved'
          AND DATE(created_at) >= ? AND DATE(created_at) <= ?
      `, [curFrom, today]),

      this.dataSource.query<{ total: string; outOfStock: string }[]>(`
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN t.so_luong_ton <= 0 THEN 1 ELSE 0 END) AS outOfStock
        FROM ton_kho t
        JOIN phien_ban_san_pham pv ON pv.phien_ban_id = t.phien_ban_id
        WHERE pv.trang_thai = 'HienThi'
      `),
    ]);

    const curSold   = Number(soldCur[0]?.total ?? 0);
    const prevSold  = Number(soldPrev[0]?.total ?? 0);
    const curNew    = Number(newCur[0]?.cnt ?? 0);
    const prevNew   = Number(newPrev[0]?.cnt ?? 0);
    const curRating = Math.round(Number(ratingRow[0]?.avg ?? 0) * 10) / 10;
    const totalSku  = Number(stockRows[0]?.total ?? 0);
    const outOfStockCount = Number(stockRows[0]?.outOfStock ?? 0);
    const curOosRate  = totalSku > 0 ? (outOfStockCount / totalSku) * 100 : 0;

    const [topRevRows, topRatingRows, slowRows, catRows] = await Promise.all([
      this.dataSource.query<{
        productId: number; name: string; unitsSold: string;
        revenue: string; returned: string; placed: string;
      }[]>(`
        SELECT sp.san_pham_id AS productId, sp.ten_san_pham AS name,
               COALESCE(SUM(ct.so_luong), 0) AS unitsSold,
               COALESCE(SUM(ct.thanh_tien), 0) AS revenue,
               COALESCE(SUM(CASE WHEN dh.trang_thai_don = 'HoanTra' THEN ct.so_luong ELSE 0 END), 0) AS returned,
               COALESCE(SUM(CASE WHEN dh.trang_thai_don IN ('DaGiao','HoanTra') THEN ct.so_luong ELSE 0 END), 0) AS placed
        FROM chi_tiet_don_hang ct
        JOIN don_hang dh ON dh.don_hang_id = ct.don_hang_id
        JOIN phien_ban_san_pham pv ON pv.phien_ban_id = ct.phien_ban_id
        JOIN san_pham sp ON sp.san_pham_id = pv.san_pham_id
        WHERE DATE(dh.ngay_dat_hang) >= ? AND DATE(dh.ngay_dat_hang) <= ?
          AND dh.trang_thai_don IN ('DaGiao', 'HoanTra')
        GROUP BY sp.san_pham_id, sp.ten_san_pham
        ORDER BY revenue DESC
        LIMIT 10
      `, [curFrom, today]),

      this.dataSource.query<{
        variantId: number; productId: number; name: string;
        avgRating: string; reviewCount: string;
      }[]>(`
        SELECT pv.phien_ban_id AS variantId, sp.san_pham_id AS productId,
               CONCAT(sp.ten_san_pham, ' - ', pv.ten_phien_ban) AS name,
               ROUND(AVG(d.rating), 1) AS avgRating,
               COUNT(*) AS reviewCount
        FROM danh_gia_san_pham d
        JOIN phien_ban_san_pham pv ON pv.phien_ban_id = d.phien_ban_id
        JOIN san_pham sp ON sp.san_pham_id = pv.san_pham_id
        WHERE d.review_status = 'Approved'
        GROUP BY pv.phien_ban_id, sp.san_pham_id, sp.ten_san_pham, pv.ten_phien_ban
        HAVING reviewCount >= 5
        ORDER BY avgRating DESC, reviewCount DESC
        LIMIT 10
      `),

      this.dataSource.query<{
        variantId: number; productId: number; name: string;
        sku: string; stock: string; daysSinceLastSold: string;
      }[]>(`
        SELECT ih.phien_ban_id AS variantId, sp.san_pham_id AS productId,
               CONCAT(sp.ten_san_pham, ' - ', pv.ten_phien_ban) AS name,
               pv.sku, ih.so_luong_ton AS stock, ih.so_ngay_khong_ban AS daysSinceLastSold
        FROM report_inventory_health ih
        JOIN phien_ban_san_pham pv ON pv.phien_ban_id = ih.phien_ban_id
        JOIN san_pham sp ON sp.san_pham_id = pv.san_pham_id
        WHERE ih.bucket = 'slow_moving' AND ih.so_luong_ton > 0
        ORDER BY ih.so_ngay_khong_ban DESC
        LIMIT 20
      `),

      this.dataSource.query<{ category: string; unitsSold: string }[]>(`
        SELECT dc.ten_danh_muc AS category, COALESCE(SUM(ct.so_luong), 0) AS unitsSold
        FROM chi_tiet_don_hang ct
        JOIN don_hang dh ON dh.don_hang_id = ct.don_hang_id
        JOIN phien_ban_san_pham pv ON pv.phien_ban_id = ct.phien_ban_id
        JOIN san_pham sp ON sp.san_pham_id = pv.san_pham_id
        JOIN danh_muc dc ON dc.danh_muc_id = sp.danh_muc_id
        WHERE DATE(dh.ngay_dat_hang) >= ? AND DATE(dh.ngay_dat_hang) <= ?
          AND dh.trang_thai_don = 'DaGiao'
        GROUP BY dc.danh_muc_id, dc.ten_danh_muc
        ORDER BY unitsSold DESC
      `, [curFrom, today]),
    ]);

    const topProductIds = topRevRows.map(r => r.productId);
    let variantMap: Record<number, { variantId: string; name: string; unitsSold: number }[]> = {};

    if (topProductIds.length > 0) {
      const placeholders = topProductIds.map(() => '?').join(',');
      const varRows = await this.dataSource.query<{
        productId: number; variantId: number; variantName: string; unitsSold: string;
      }[]>(`
        SELECT sp.san_pham_id AS productId, pv.phien_ban_id AS variantId,
               pv.ten_phien_ban AS variantName, COALESCE(SUM(ct.so_luong), 0) AS unitsSold
        FROM chi_tiet_don_hang ct
        JOIN don_hang dh ON dh.don_hang_id = ct.don_hang_id
        JOIN phien_ban_san_pham pv ON pv.phien_ban_id = ct.phien_ban_id
        JOIN san_pham sp ON sp.san_pham_id = pv.san_pham_id
        WHERE sp.san_pham_id IN (${placeholders})
          AND DATE(dh.ngay_dat_hang) >= ? AND DATE(dh.ngay_dat_hang) <= ?
          AND dh.trang_thai_don = 'DaGiao'
        GROUP BY sp.san_pham_id, pv.phien_ban_id, pv.ten_phien_ban
        ORDER BY unitsSold DESC
      `, [...topProductIds, curFrom, today]);

      for (const vr of varRows) {
        variantMap[vr.productId] ??= [];
        variantMap[vr.productId].push({
          variantId: String(vr.variantId),
          name: vr.variantName,
          unitsSold: Number(vr.unitsSold),
        });
      }
    }

    return {
      kpis: {
        totalSold:      buildKpiCard('Số lượng bán', curSold, prevSold, 'count'),
        newListings:    buildKpiCard('Sản phẩm mới', curNew, prevNew, 'count'),
        avgRating:      buildKpiCard('Rating trung bình', curRating, 0),
        outOfStockRate: buildKpiCard('Tỉ lệ hết hàng', curOosRate, 0, 'percent'),
      },
      topByRevenue: topRevRows.map(r => {
        const placed = Number(r.placed);
        const returned = Number(r.returned);
        return {
          productId:  String(r.productId),
          name:       r.name,
          unitsSold:  Number(r.unitsSold),
          revenue:    Number(r.revenue),
          returnRate: placed > 0 ? Math.round((returned / placed) * 1000) / 10 : 0,
          variants:   variantMap[r.productId] ?? [],
        };
      }),
      topByRating: topRatingRows.map(r => ({
        variantId:   String(r.variantId),
        productId:   String(r.productId),
        name:        r.name,
        avgRating:   Number(r.avgRating),
        reviewCount: Number(r.reviewCount),
      })),
      slowMoving: slowRows.map(r => ({
        variantId:         String(r.variantId),
        productId:         String(r.productId),
        name:              r.name,
        sku:               r.sku,
        stock:             Number(r.stock),
        daysSinceLastSale: Number(r.daysSinceLastSold),
      })),
      soldByCategory: catRows.map(r => ({
        category:  r.category,
        unitsSold: Number(r.unitsSold),
      })),
    };
  }
}
