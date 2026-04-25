import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReportsQueryService } from '../reports/reports-query.service';

const STATUS_MAP: Record<string, string> = {
  ChoTT: 'pending',
  DaXacNhan: 'confirmed',
  DongGoi: 'processing',
  DangGiao: 'shipped',
  DaGiao: 'delivered',
  DaHuy: 'cancelled',
  HoanTra: 'returned',
};

@Injectable()
export class DashboardService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly reportsQueryService: ReportsQueryService,
  ) {}

  async getOverview() {
    const [kpis, revenueChart, topProductsRaw, ordersByStatus, recentOrders, lowStock] =
      await Promise.all([
        this.getKpis(),
        this.getRevenueChart(),
        this.reportsQueryService.getTopProducts({ period: '30d', limit: 5 }),
        this.getOrdersByStatus(),
        this.getRecentOrders(),
        this.getLowStock(),
      ]);

    const topProducts = (topProductsRaw as any[]).map((p) => ({
      productId: String(p.variantId),
      name: p.productName as string,
      unitsSold: Number(p.totalSold),
      revenue: Number(p.totalRevenue),
    }));

    return { kpis, revenueChart, topProducts, ordersByStatus, recentOrders, lowStock };
  }

  private monthBounds() {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return {
      thisStart: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
      lastStart: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      lastEnd: fmt(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }

  private daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  private pct(curr: number, prev: number): number {
    if (prev === 0) return 0;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  }

  private async getKpis() {
    const { thisStart, lastStart, lastEnd } = this.monthBounds();
    const since9d = this.daysAgo(9);

    const [revThis, revLast, ordThis, ordLast, cusThis, cusLast, lowNow,
           revSpark, ordSpark, cusSpark] = await Promise.all([
      this.dataSource.query(
        `SELECT COALESCE(SUM(tong_thanh_toan), 0) AS v FROM don_hang
         WHERE ngay_dat_hang >= ? AND trang_thai_don != 'DaHuy'`,
        [thisStart],
      ),
      this.dataSource.query(
        `SELECT COALESCE(SUM(tong_thanh_toan), 0) AS v FROM don_hang
         WHERE ngay_dat_hang BETWEEN ? AND ? AND trang_thai_don != 'DaHuy'`,
        [lastStart, lastEnd],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) AS v FROM don_hang WHERE ngay_dat_hang >= ?`,
        [thisStart],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) AS v FROM don_hang WHERE ngay_dat_hang BETWEEN ? AND ?`,
        [lastStart, lastEnd],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) AS v FROM khach_hang WHERE ngay_dang_ky >= ?`,
        [thisStart],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) AS v FROM khach_hang WHERE ngay_dang_ky BETWEEN ? AND ?`,
        [lastStart, lastEnd],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) AS v FROM ton_kho WHERE so_luong_ton <= nguong_canh_bao`,
      ),
      this.dataSource.query(
        `SELECT DATE(ngay_dat_hang) AS d, COALESCE(SUM(tong_thanh_toan), 0) AS v
         FROM don_hang WHERE ngay_dat_hang >= ? AND trang_thai_don != 'DaHuy'
         GROUP BY DATE(ngay_dat_hang) ORDER BY d ASC`,
        [since9d],
      ),
      this.dataSource.query(
        `SELECT DATE(ngay_dat_hang) AS d, COUNT(*) AS v
         FROM don_hang WHERE ngay_dat_hang >= ?
         GROUP BY DATE(ngay_dat_hang) ORDER BY d ASC`,
        [since9d],
      ),
      this.dataSource.query(
        `SELECT DATE(ngay_dang_ky) AS d, COUNT(*) AS v
         FROM khach_hang WHERE ngay_dang_ky >= ?
         GROUP BY DATE(ngay_dang_ky) ORDER BY d ASC`,
        [since9d],
      ),
    ]);

    const toSpark = (rows: { v: string }[]) => rows.map((r) => Number(r.v));
    const rv = Number((revThis as any[])[0].v);
    const rl = Number((revLast as any[])[0].v);
    const ov = Number((ordThis as any[])[0].v);
    const ol = Number((ordLast as any[])[0].v);
    const cv = Number((cusThis as any[])[0].v);
    const cl = Number((cusLast as any[])[0].v);
    const lv = Number((lowNow as any[])[0].v);

    return {
      revenue:       { value: rv, changePercent: this.pct(rv, rl), sparkline: toSpark(revSpark as any[]) },
      orders:        { value: ov, changePercent: this.pct(ov, ol), sparkline: toSpark(ordSpark as any[]) },
      newCustomers:  { value: cv, changePercent: this.pct(cv, cl), sparkline: toSpark(cusSpark as any[]) },
      lowStockCount: { value: lv, changePercent: 0, sparkline: Array(9).fill(lv) as number[] },
    };
  }

  private async getRevenueChart(): Promise<{ date: string; revenue: number }[]> {
    const rows: { d: string; v: string }[] = await this.dataSource.query(
      `SELECT DATE(ngay_dat_hang) AS d, COALESCE(SUM(tong_thanh_toan), 0) AS v
       FROM don_hang WHERE ngay_dat_hang >= ? AND trang_thai_don != 'DaHuy'
       GROUP BY DATE(ngay_dat_hang) ORDER BY d ASC`,
      [this.daysAgo(90)],
    );
    return rows.map((r) => ({ date: r.d, revenue: Number(r.v) }));
  }

  private async getOrdersByStatus(): Promise<{ status: string; count: number }[]> {
    const rows: { s: string; cnt: string }[] = await this.dataSource.query(
      `SELECT trang_thai_don AS s, COUNT(*) AS cnt FROM don_hang GROUP BY trang_thai_don`,
    );
    return rows.map((r) => ({
      status: STATUS_MAP[r.s] ?? r.s,
      count: Number(r.cnt),
    }));
  }

  private async getRecentOrders() {
    const rows: { id: number; customerName: string; total: string; status: string; date: string }[] =
      await this.dataSource.query(
        `SELECT dh.don_hang_id AS id, kh.ho_ten AS customerName,
                dh.tong_thanh_toan AS total, dh.trang_thai_don AS status,
                DATE(dh.ngay_dat_hang) AS date
         FROM don_hang dh
         INNER JOIN khach_hang kh ON kh.khach_hang_id = dh.khach_hang_id
         ORDER BY dh.ngay_dat_hang DESC
         LIMIT 7`,
      );
    return rows.map((r) => ({
      id: String(r.id),
      customerName: r.customerName,
      total: Number(r.total),
      status: STATUS_MAP[r.status] ?? r.status,
      date: r.date,
    }));
  }

  private async getLowStock() {
    const rows: { variantId: number; name: string; sku: string; stock: number; threshold: number }[] =
      await this.dataSource.query(
        `SELECT tk.phien_ban_id AS variantId, sp.ten_san_pham AS name,
                v.SKU AS sku, tk.so_luong_ton AS stock, tk.nguong_canh_bao AS threshold
         FROM ton_kho tk
         INNER JOIN phien_ban_san_pham v ON v.phien_ban_id = tk.phien_ban_id
         INNER JOIN san_pham sp ON sp.san_pham_id = v.san_pham_id
         WHERE tk.so_luong_ton <= tk.nguong_canh_bao
         ORDER BY tk.so_luong_ton ASC
         LIMIT 5`,
      );
    return rows.map((r) => ({
      productId: String(r.variantId),
      name: r.name,
      sku: r.sku,
      currentStock: Number(r.stock),
      threshold: Number(r.threshold),
    }));
  }
}
