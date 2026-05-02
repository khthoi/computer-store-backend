import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockBatch } from './entities/stock-batch.entity';
import { StockHistory } from './entities/stock-history.entity';
import { StockLevel } from './entities/stock-level.entity';
import { ImportReceiptItem } from './entities/import-receipt-item.entity';
import { ImportReceipt } from './entities/import-receipt.entity';
import { InventoryHealthReport } from '../reports/entities/inventory-health-report.entity';

@Injectable()
export class InventoryKpiService {
  constructor(
    @InjectRepository(StockBatch)
    private readonly batchRepo: Repository<StockBatch>,
    @InjectRepository(StockHistory)
    private readonly historyRepo: Repository<StockHistory>,
    @InjectRepository(StockLevel)
    private readonly stockRepo: Repository<StockLevel>,
    @InjectRepository(ImportReceiptItem)
    private readonly receiptItemRepo: Repository<ImportReceiptItem>,
    @InjectRepository(ImportReceipt)
    private readonly receiptRepo: Repository<ImportReceipt>,
    @InjectRepository(InventoryHealthReport)
    private readonly healthRepo: Repository<InventoryHealthReport>,
  ) {}

  async getDeadStock(thresholdDays = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - thresholdDays);

    return this.batchRepo
      .createQueryBuilder('b')
      .where('b.ngay_nhap < :cutoff', { cutoff })
      .andWhere('b.so_luong_con_lai > 0')
      .andWhere("b.trang_thai = 'con_hang'")
      .select('b.phien_ban_id', 'phienBanId')
      .addSelect('SUM(b.so_luong_con_lai)', 'soLuongTon')
      .addSelect('DATEDIFF(NOW(), MIN(b.ngay_nhap))', 'soNgayTon')
      .addSelect('SUM(b.so_luong_con_lai * b.don_gia_nhap)', 'giaTriTon')
      .groupBy('b.phien_ban_id')
      .getRawMany();
  }

  async getTurnoverRate(startDate: string, endDate: string) {
    const cogsResult = await this.historyRepo
      .createQueryBuilder('h')
      .select('SUM(ABS(h.so_luong) * h.gia_von)', 'totalCogs')
      .where("h.loai_giao_dich = 'Xuat'")
      .andWhere('h.thoi_diem BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('h.gia_von IS NOT NULL')
      .getRawOne<{ totalCogs: string }>();

    const avgInventory = await this.stockRepo
      .createQueryBuilder('tk')
      .select('SUM(tk.so_luong_ton * tk.gia_von_trung_binh)', 'avgValue')
      .getRawOne<{ avgValue: string }>();

    const cogs = Number(cogsResult?.totalCogs ?? 0);
    const avg = Number(avgInventory?.avgValue ?? 0);
    return { turnoverRate: avg === 0 ? 0 : +(cogs / avg).toFixed(2), cogs, avgInventoryValue: avg };
  }

  async getPendingImportValue() {
    const result = await this.receiptItemRepo
      .createQueryBuilder('ci')
      .innerJoin('ci.receipt', 'r')
      .select('SUM(ci.so_luong_du_kien * ci.don_gia_nhap)', 'pendingValue')
      .where("r.trang_thai = 'ChoDuyet'")
      .getRawOne<{ pendingValue: string }>();
    return { pendingImportValue: Number(result?.pendingValue ?? 0) };
  }

  async getTopMovingItems(days = 30, limit = 10) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.historyRepo
      .createQueryBuilder('h')
      .select('h.phien_ban_id', 'phienBanId')
      .addSelect('SUM(ABS(h.so_luong))', 'totalQty')
      .where("h.loai_giao_dich = 'Xuat'")
      .andWhere('h.thoi_diem >= :since', { since })
      .groupBy('h.phien_ban_id')
      .orderBy('totalQty', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  async getLowAndOutOfStock() {
    const [lowStockCount, outOfStockCount, totalInventoryValue] = await Promise.all([
      this.stockRepo.createQueryBuilder('tk').where('tk.so_luong_ton < tk.nguong_canh_bao AND tk.so_luong_ton > 0').getCount(),
      this.stockRepo.createQueryBuilder('tk').where('tk.so_luong_ton = 0').getCount(),
      this.stockRepo.createQueryBuilder('tk').select('SUM(tk.so_luong_ton * tk.gia_von_trung_binh)', 'v').getRawOne<{ v: string }>(),
    ]);
    return { lowStockCount, outOfStockCount, totalInventoryValue: Number(totalInventoryValue?.v ?? 0) };
  }

  async getDashboard(params: { thresholdDays?: number; startDate?: string; endDate?: string }) {
    const today = new Date().toISOString().slice(0, 10);
    const startDate = params.startDate ?? new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10);
    const endDate = params.endDate ?? today;

    const [deadStock, turnover, pendingImport, topMoving, stockStats] = await Promise.all([
      this.getDeadStock(params.thresholdDays ?? 90),
      this.getTurnoverRate(startDate, endDate),
      this.getPendingImportValue(),
      this.getTopMovingItems(30, 10),
      this.getLowAndOutOfStock(),
    ]);

    return {
      deadStockCount: deadStock.length,
      deadStockValue: deadStock.reduce((s: number, r: any) => s + Number(r.giaTriTon ?? 0), 0),
      turnoverRate: turnover.turnoverRate,
      pendingImportValue: pendingImport.pendingImportValue,
      topMovingItems: topMoving,
      ...stockStats,
    };
  }
}
