import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { DailyRevenueReport } from './entities/daily-revenue-report.entity';
import { RfmSnapshot } from './entities/rfm-snapshot.entity';
import { InventoryHealthReport } from './entities/inventory-health-report.entity';

@Injectable()
export class ReportsExportService {
  constructor(
    @InjectRepository(DailyRevenueReport)
    private readonly revenueRepo: Repository<DailyRevenueReport>,
    @InjectRepository(RfmSnapshot)
    private readonly rfmRepo: Repository<RfmSnapshot>,
    @InjectRepository(InventoryHealthReport)
    private readonly inventoryRepo: Repository<InventoryHealthReport>,
    private readonly dataSource: DataSource,
  ) {}

  async exportRevenue(startDate?: string, endDate?: string): Promise<ArrayBuffer> {
    const start = startDate ?? this.daysAgo(30);
    const end = endDate ?? this.today();

    const rows = await this.revenueRepo
      .createQueryBuilder('r')
      .where('r.date BETWEEN :start AND :end', { start, end })
      .orderBy('r.date', 'ASC')
      .getMany();

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Doanh Thu');

    ws.columns = [
      { header: 'Ngày', key: 'date', width: 14 },
      { header: 'GMV (VNĐ)', key: 'gmv', width: 18 },
      { header: 'Doanh Thu Thuần (VNĐ)', key: 'netRevenue', width: 22 },
      { header: 'Tổng Giảm Giá', key: 'totalDiscount', width: 18 },
      { header: 'Phí Vận Chuyển', key: 'shippingFee', width: 18 },
      { header: 'Đơn Đặt', key: 'ordersPlaced', width: 12 },
      { header: 'Đơn Hoàn Thành', key: 'ordersCompleted', width: 18 },
      { header: 'Đơn Hủy', key: 'ordersCancelled', width: 12 },
      { header: 'Đơn Hoàn Trả', key: 'ordersReturned', width: 14 },
      { header: 'Giá Trị Đơn TB', key: 'avgOrderValue', width: 18 },
      { header: 'Khách Mới', key: 'newCustomers', width: 14 },
      { header: 'Khách Mua Lại', key: 'returningCustomers', width: 16 },
    ];

    this.styleHeader(ws);
    rows.forEach((r) => ws.addRow(r));

    return wb.xlsx.writeBuffer();
  }

  async exportRfm(): Promise<ArrayBuffer> {
    const rows = await this.rfmRepo.find({ order: { monetary: 'DESC' } });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('RFM Khách Hàng');

    ws.columns = [
      { header: 'Khách Hàng ID', key: 'customerId', width: 16 },
      { header: 'Segment', key: 'segment', width: 18 },
      { header: 'R Score', key: 'rScore', width: 10 },
      { header: 'F Score', key: 'fScore', width: 10 },
      { header: 'M Score', key: 'mScore', width: 10 },
      { header: 'Tổng Chi Tiêu (VNĐ)', key: 'monetary', width: 22 },
      { header: 'Số Đơn', key: 'frequency', width: 12 },
      { header: 'Giá Trị Đơn TB', key: 'avgOrderValue', width: 18 },
      { header: 'Ngày Mua Cuối', key: 'lastPurchaseDate', width: 16 },
      { header: 'Số Ngày Không Mua', key: 'recencyDays', width: 20 },
      { header: 'Ngày Đăng Ký', key: 'registeredAt', width: 16 },
      { header: 'Số Đơn Hoàn Trả', key: 'returnCount', width: 18 },
    ];

    this.styleHeader(ws);
    rows.forEach((r) => ws.addRow(r));

    return wb.xlsx.writeBuffer();
  }

  async exportInventoryHealth(): Promise<ArrayBuffer> {
    const rows = await this.dataSource
      .createQueryBuilder()
      .select([
        'ih.phien_ban_id AS variantId',
        'v.SKU AS sku',
        'v.ten_phien_ban AS variantName',
        'sp.ten_san_pham AS productName',
        'ih.so_luong_ton AS stockQty',
        'ih.doi AS daysOfInventory',
        'ih.bucket AS bucket',
        'ih.ban_trung_binh_ngay_30d AS avgDailySold30d',
        'ih.gia_tri_ton_uoc_tinh AS estimatedStockValue',
        'ih.ngay_ban_cuoi AS lastSoldDate',
      ])
      .from('report_inventory_health', 'ih')
      .innerJoin('phien_ban_san_pham', 'v', 'v.phien_ban_id = ih.phien_ban_id')
      .innerJoin('san_pham', 'sp', 'sp.san_pham_id = v.san_pham_id')
      .orderBy('ih.doi', 'ASC')
      .getRawMany();

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Tình Trạng Kho');

    ws.columns = [
      { header: 'Variant ID', key: 'variantId', width: 12 },
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Tên Biến Thể', key: 'variantName', width: 30 },
      { header: 'Tên Sản Phẩm', key: 'productName', width: 35 },
      { header: 'Tồn Kho', key: 'stockQty', width: 12 },
      { header: 'DOI (ngày)', key: 'daysOfInventory', width: 14 },
      { header: 'Bucket', key: 'bucket', width: 14 },
      { header: 'TB Bán/Ngày (30d)', key: 'avgDailySold30d', width: 20 },
      { header: 'Giá Trị Tồn Ước Tính', key: 'estimatedStockValue', width: 22 },
      { header: 'Ngày Bán Cuối', key: 'lastSoldDate', width: 16 },
    ];

    this.styleHeader(ws);
    rows.forEach((r) => ws.addRow(r));

    return wb.xlsx.writeBuffer();
  }

  private styleHeader(ws: ExcelJS.Worksheet): void {
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private daysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }
}
