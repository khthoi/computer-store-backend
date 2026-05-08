import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InventoryHealthReport } from './entities/inventory-health-report.entity';
import { buildKpiCard, todayStr, daysAgoStr } from './reports-agg.helpers';

export interface InventoryReport {
  kpis: {
    totalSku:     ReturnType<typeof buildKpiCard>;
    outOfStock:   ReturnType<typeof buildKpiCard>;
    avgDoi:       ReturnType<typeof buildKpiCard>;
    turnoverRate: ReturnType<typeof buildKpiCard>;
  };
  stockHealthBuckets: {
    label: string;
    count: number;
    variant: 'success' | 'warning' | 'error' | 'default';
  }[];
  lowStockItems: {
    variantId: string;
    productId: string;
    name: string;
    sku: string;
    thumbnail?: string;
    currentStock: number;
    threshold: number;
    doi: number;
  }[];
  overStockItems: {
    variantId: string;
    productId: string;
    name: string;
    sku: string;
    stock: number;
    doi: number;
    estimatedValue: number;
  }[];
  stockMovementSeries: { date: string; value: number }[];
}

const BUCKET_META: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
  healthy:      { label: 'Đủ hàng',        variant: 'success' },
  low_stock:    { label: 'Sắp hết hàng',   variant: 'warning' },
  out_of_stock: { label: 'Hết hàng',       variant: 'error'   },
  overstock:    { label: 'Tồn kho cao',    variant: 'warning' },
  slow_moving:  { label: 'Bán chậm',       variant: 'default' },
  dead_stock:   { label: 'Hàng tồn chết',  variant: 'error'   },
};

@Injectable()
export class ReportsAggInventoryService {
  constructor(
    @InjectRepository(InventoryHealthReport)
    private readonly ihRepo: Repository<InventoryHealthReport>,
    private readonly dataSource: DataSource,
  ) {}

  async computeInventory(): Promise<InventoryReport> {
    const today = todayStr();
    const from30 = daysAgoStr(30);

    const allHealth = await this.ihRepo.find();
    const total = allHealth.length;
    const outOfStockCount = allHealth.filter(r => r.stockQty <= 0).length;
    const totalDoi = allHealth.reduce((a, r) => a + Number(r.daysOfInventory), 0);
    const avgDoi = total > 0 ? Math.round(totalDoi / total) : 0;

    // Turnover rate = total units sold last 30d / avg stock
    const [turnoverRow] = await this.dataSource.query<{ sold: string }[]>(`
      SELECT COALESCE(SUM(ct.so_luong), 0) AS sold
      FROM chi_tiet_don_hang ct
      JOIN don_hang dh ON dh.don_hang_id = ct.don_hang_id
      WHERE DATE(dh.ngay_dat_hang) >= ? AND DATE(dh.ngay_dat_hang) <= ?
        AND dh.trang_thai_don = 'DaGiao'
    `, [from30, today]);

    const soldLast30 = Number(turnoverRow?.sold ?? 0);
    const totalStock = allHealth.reduce((a, r) => a + Number(r.stockQty), 0);
    const turnoverRate = totalStock > 0 ? Math.round((soldLast30 / totalStock) * 10) / 10 : 0;

    // Bucket counts
    const bucketCounts = new Map<string, number>();
    for (const r of allHealth) {
      bucketCounts.set(r.bucket, (bucketCounts.get(r.bucket) ?? 0) + 1);
    }

    const stockHealthBuckets = Object.entries(BUCKET_META).map(([key, meta]) => ({
      label:   meta.label,
      count:   bucketCounts.get(key) ?? 0,
      variant: meta.variant,
    }));

    const lowStockRows = await this.dataSource.query<{
      variantId: number; productId: number; name: string; sku: string;
      thumbnail: string | null; currentStock: string; threshold: string; doi: string;
    }[]>(`
      SELECT ih.phien_ban_id AS variantId, sp.san_pham_id AS productId,
             CONCAT(sp.ten_san_pham, ' - ', pv.ten_phien_ban) AS name,
             pv.sku, NULL AS thumbnail,
             ih.so_luong_ton AS currentStock,
             ih.nguong_canh_bao AS threshold,
             ih.doi AS doi
      FROM report_inventory_health ih
      JOIN phien_ban_san_pham pv ON pv.phien_ban_id = ih.phien_ban_id
      JOIN san_pham sp ON sp.san_pham_id = pv.san_pham_id
      WHERE ih.bucket = 'low_stock'
      ORDER BY ih.so_luong_ton ASC
      LIMIT 20
    `);

    const overStockRows = await this.dataSource.query<{
      variantId: number; productId: number; name: string; sku: string;
      stock: string; doi: string; estimatedValue: string;
    }[]>(`
      SELECT ih.phien_ban_id AS variantId, sp.san_pham_id AS productId,
             CONCAT(sp.ten_san_pham, ' - ', pv.ten_phien_ban) AS name,
             pv.sku, ih.so_luong_ton AS stock, ih.doi AS doi,
             ih.gia_tri_ton_uoc_tinh AS estimatedValue
      FROM report_inventory_health ih
      JOIN phien_ban_san_pham pv ON pv.phien_ban_id = ih.phien_ban_id
      JOIN san_pham sp ON sp.san_pham_id = pv.san_pham_id
      WHERE ih.bucket = 'overstock'
      ORDER BY ih.gia_tri_ton_uoc_tinh DESC
      LIMIT 20
    `);

    const movementRows = await this.dataSource.query<{ date: string; value: string }[]>(`
      SELECT DATE(lx.thoi_diem) AS date, SUM(lx.so_luong) AS value
      FROM lich_su_nhap_xuat lx
      WHERE DATE(lx.thoi_diem) >= ? AND DATE(lx.thoi_diem) <= ?
        AND lx.loai_giao_dich = 'xuat'
      GROUP BY DATE(lx.thoi_diem)
      ORDER BY date ASC
    `, [from30, today]);

    return {
      kpis: {
        totalSku:     buildKpiCard('Tổng SKU', total, 0, 'count'),
        outOfStock:   buildKpiCard('Hết hàng', outOfStockCount, 0, 'count'),
        avgDoi:       buildKpiCard('DOI trung bình', avgDoi, 0, 'days'),
        turnoverRate: buildKpiCard('Vòng quay hàng', turnoverRate, 0),
      },
      stockHealthBuckets,
      lowStockItems: lowStockRows.map(r => ({
        variantId:    String(r.variantId),
        productId:    String(r.productId),
        name:         r.name,
        sku:          r.sku,
        thumbnail:    r.thumbnail ?? undefined,
        currentStock: Number(r.currentStock),
        threshold:    Number(r.threshold),
        doi:          Number(r.doi),
      })),
      overStockItems: overStockRows.map(r => ({
        variantId:      String(r.variantId),
        productId:      String(r.productId),
        name:           r.name,
        sku:            r.sku,
        stock:          Number(r.stock),
        doi:            Number(r.doi),
        estimatedValue: Number(r.estimatedValue),
      })),
      stockMovementSeries: movementRows.map(r => ({ date: r.date, value: Number(r.value) })),
    };
  }
}
