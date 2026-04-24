import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DailyRevenueReport } from './entities/daily-revenue-report.entity';
import { RfmSnapshot } from './entities/rfm-snapshot.entity';
import { RetentionCohort } from './entities/retention-cohort.entity';
import { InventoryHealthReport } from './entities/inventory-health-report.entity';
import { ReportJobLog } from './entities/report-job-log.entity';

// RFM segment mapping — score combinations → segment label
const RFM_SEGMENTS: Array<{ label: string; test: (r: number, f: number, m: number) => boolean }> = [
  { label: 'Champions',   test: (r, f, m) => r >= 5 && f >= 4 && m >= 4 },
  { label: 'Loyal',       test: (r, f, m) => f >= 4 && m >= 3 },
  { label: 'Potential',   test: (r, f, m) => r >= 4 && f <= 2 },
  { label: 'Promising',   test: (r, f, m) => r >= 3 && f <= 2 && m <= 2 },
  { label: 'At Risk',     test: (r, f, m) => r <= 2 && f >= 3 },
  { label: 'Lost',        test: (r, f, m) => r === 1 && f >= 2 },
  { label: 'New',         test: (r, f, m) => r >= 4 && f === 1 },
  { label: 'Hibernating', test: () => true }, // fallback
];

@Injectable()
export class ReportsComputeService {
  constructor(
    @InjectRepository(DailyRevenueReport)
    private readonly revenueRepo: Repository<DailyRevenueReport>,
    @InjectRepository(RfmSnapshot)
    private readonly rfmRepo: Repository<RfmSnapshot>,
    @InjectRepository(RetentionCohort)
    private readonly cohortRepo: Repository<RetentionCohort>,
    @InjectRepository(InventoryHealthReport)
    private readonly inventoryRepo: Repository<InventoryHealthReport>,
    @InjectRepository(ReportJobLog)
    private readonly jobLogRepo: Repository<ReportJobLog>,
    private readonly dataSource: DataSource,
  ) {}

  async startJobLog(jobName: string): Promise<ReportJobLog> {
    const log = this.jobLogRepo.create({ jobName, status: 'running', startedAt: new Date() });
    return this.jobLogRepo.save(log);
  }

  async finishJobLog(log: ReportJobLog, rowsProcessed: number): Promise<void> {
    log.status = 'success';
    log.finishedAt = new Date();
    log.durationMs = log.finishedAt.getTime() - log.startedAt.getTime();
    log.rowsProcessed = rowsProcessed;
    await this.jobLogRepo.save(log);
  }

  async failJobLog(log: ReportJobLog, error: string): Promise<void> {
    log.status = 'failed';
    log.finishedAt = new Date();
    log.durationMs = log.finishedAt.getTime() - log.startedAt.getTime();
    log.errorMessage = error;
    await this.jobLogRepo.save(log);
  }

  async computeDailyRevenue(dateStr: string): Promise<number> {
    const rows = await this.dataSource
      .createQueryBuilder()
      .select('SUM(dh.tong_thanh_toan)', 'gmv')
      .addSelect('SUM(dh.tong_tien_hang)', 'subtotal')
      .addSelect('SUM(dh.discount_total)', 'discount')
      .addSelect('SUM(dh.phi_van_chuyen)', 'shipping')
      .addSelect('COUNT(*)', 'placed')
      .addSelect("SUM(CASE WHEN dh.trang_thai_don = 'DaGiao' THEN 1 ELSE 0 END)", 'completed')
      .addSelect("SUM(CASE WHEN dh.trang_thai_don = 'DaHuy' THEN 1 ELSE 0 END)", 'cancelled')
      .addSelect("SUM(CASE WHEN dh.trang_thai_don = 'HoanTra' THEN 1 ELSE 0 END)", 'returned')
      .from('don_hang', 'dh')
      .where('DATE(dh.ngay_dat_hang) = :date', { date: dateStr })
      .getRawOne();

    const gmv = Number(rows.gmv ?? 0);
    const placed = Number(rows.placed ?? 0);
    const newCustomersRow = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(DISTINCT dh.khach_hang_id)', 'newCust')
      .from('don_hang', 'dh')
      .innerJoin(
        'khach_hang',
        'kh',
        'kh.khach_hang_id = dh.khach_hang_id AND DATE(kh.ngay_dang_ky) = :date',
        { date: dateStr },
      )
      .where('DATE(dh.ngay_dat_hang) = :date', { date: dateStr })
      .getRawOne();

    const returningRow = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(DISTINCT dh.khach_hang_id)', 'retCust')
      .from('don_hang', 'dh')
      .where('DATE(dh.ngay_dat_hang) = :date', { date: dateStr })
      .andWhere(
        `dh.khach_hang_id IN (
          SELECT DISTINCT khach_hang_id FROM don_hang
          WHERE DATE(ngay_dat_hang) < :date
        )`,
        { date: dateStr },
      )
      .getRawOne();

    const report: Partial<DailyRevenueReport> = {
      date: dateStr,
      gmv,
      netRevenue: gmv - Number(rows.discount ?? 0),
      totalDiscount: Number(rows.discount ?? 0),
      shippingFee: Number(rows.shipping ?? 0),
      ordersPlaced: placed,
      ordersCompleted: Number(rows.completed ?? 0),
      ordersCancelled: Number(rows.cancelled ?? 0),
      ordersReturned: Number(rows.returned ?? 0),
      avgOrderValue: placed > 0 ? Math.round(gmv / placed) : 0,
      newCustomers: Number(newCustomersRow.newCust ?? 0),
      returningCustomers: Number(returningRow.retCust ?? 0),
      computedAt: new Date(),
    };

    await this.revenueRepo.upsert(report as DailyRevenueReport, { conflictPaths: ['date'] });
    return 1;
  }

  async computeRfmSnapshot(): Promise<number> {
    const now = new Date();
    const rows = await this.dataSource
      .createQueryBuilder()
      .select('kh.khach_hang_id', 'customerId')
      .addSelect('kh.ngay_dang_ky', 'registeredAt')
      .addSelect('MAX(dh.ngay_dat_hang)', 'lastPurchase')
      .addSelect('COUNT(dh.don_hang_id)', 'frequency')
      .addSelect('SUM(dh.tong_thanh_toan)', 'monetary')
      .addSelect("SUM(CASE WHEN dh.trang_thai_don = 'HoanTra' THEN 1 ELSE 0 END)", 'returns')
      .from('khach_hang', 'kh')
      .leftJoin(
        'don_hang',
        'dh',
        "dh.khach_hang_id = kh.khach_hang_id AND dh.trang_thai_don = 'DaGiao'",
      )
      .where("kh.trang_thai = 'HoatDong'")
      .groupBy('kh.khach_hang_id')
      .getRawMany();

    if (rows.length === 0) return 0;

    // Compute quintile boundaries for scoring
    const monetaryValues = rows.map((r) => Number(r.monetary ?? 0)).sort((a, b) => a - b);
    const frequencyValues = rows.map((r) => Number(r.frequency ?? 0)).sort((a, b) => a - b);
    const recencyValues = rows
      .map((r) => (r.lastPurchase ? Math.floor((now.getTime() - new Date(r.lastPurchase).getTime()) / 86400000) : 9999))
      .sort((a, b) => a - b);

    const quintile = (arr: number[], value: number): number => {
      const pct = arr.filter((v) => v <= value).length / arr.length;
      if (pct <= 0.2) return 1;
      if (pct <= 0.4) return 2;
      if (pct <= 0.6) return 3;
      if (pct <= 0.8) return 4;
      return 5;
    };

    const snapshots: RfmSnapshot[] = rows.map((r) => {
      const recencyDays = r.lastPurchase
        ? Math.floor((now.getTime() - new Date(r.lastPurchase).getTime()) / 86400000)
        : 9999;
      const freq = Number(r.frequency ?? 0);
      const mon = Number(r.monetary ?? 0);

      // Recency: lower days = better = higher score (inverted quintile)
      const rScore = 6 - quintile(recencyValues, recencyDays);
      const fScore = quintile(frequencyValues, freq);
      const mScore = quintile(monetaryValues, mon);

      const seg = RFM_SEGMENTS.find((s) => s.test(rScore, fScore, mScore))!;

      return this.rfmRepo.create({
        customerId: r.customerId,
        recencyDays,
        lastPurchaseDate: r.lastPurchase ? new Date(r.lastPurchase).toISOString().slice(0, 10) : null,
        frequency: freq,
        monetary: mon,
        rScore,
        fScore,
        mScore,
        segment: seg.label,
        registeredAt: new Date(r.registeredAt).toISOString().slice(0, 10),
        returnCount: Number(r.returns ?? 0),
        avgOrderValue: freq > 0 ? Math.round(mon / freq) : 0,
        computedAt: now,
      });
    });

    await this.dataSource.query('TRUNCATE TABLE report_rfm_snapshot');
    await this.rfmRepo.save(snapshots, { chunk: 500 });
    return snapshots.length;
  }

  async computeInventoryHealth(): Promise<number> {
    const now = new Date();
    const cutoff30 = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
    const cutoff90 = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);

    const variants = await this.dataSource
      .createQueryBuilder()
      .select('v.phien_ban_id', 'variantId')
      .addSelect('v.gia_ban', 'salePrice')
      .addSelect('COALESCE(SUM(tk.so_luong_ton), 0)', 'stockQty')
      .addSelect('COALESCE(MAX(tk.nguong_canh_bao), 0)', 'threshold')
      .from('phien_ban_san_pham', 'v')
      .leftJoin('ton_kho', 'tk', 'tk.phien_ban_id = v.phien_ban_id')
      .where("v.trang_thai != 'An'")
      .groupBy('v.phien_ban_id')
      .getRawMany();

    const sold30 = await this.dataSource
      .createQueryBuilder()
      .select('od.phien_ban_id', 'variantId')
      .addSelect('SUM(od.so_luong)', 'qty')
      .addSelect('MAX(dh.ngay_dat_hang)', 'lastSold')
      .from('chi_tiet_don_hang', 'od')
      .innerJoin('don_hang', 'dh', "dh.don_hang_id = od.don_hang_id AND dh.trang_thai_don = 'DaGiao'")
      .where('DATE(dh.ngay_dat_hang) >= :cutoff', { cutoff: cutoff30 })
      .groupBy('od.phien_ban_id')
      .getRawMany();

    const sold90 = await this.dataSource
      .createQueryBuilder()
      .select('od.phien_ban_id', 'variantId')
      .addSelect('SUM(od.so_luong)', 'qty')
      .from('chi_tiet_don_hang', 'od')
      .innerJoin('don_hang', 'dh', "dh.don_hang_id = od.don_hang_id AND dh.trang_thai_don = 'DaGiao'")
      .where('DATE(dh.ngay_dat_hang) >= :cutoff', { cutoff: cutoff90 })
      .groupBy('od.phien_ban_id')
      .getRawMany();

    const soldMap30 = Object.fromEntries(sold30.map((r) => [r.variantId, r]));
    const soldMap90 = Object.fromEntries(sold90.map((r) => [r.variantId, { qty: r.qty }]));

    const snapshots: InventoryHealthReport[] = variants.map((v) => {
      const stock = Number(v.stockQty);
      const avg30 = soldMap30[v.variantId] ? Number(soldMap30[v.variantId].qty) / 30 : 0;
      const avg90 = soldMap90[v.variantId] ? Number(soldMap90[v.variantId].qty) / 90 : 0;
      const doi = avg30 > 0 ? Math.round(stock / avg30) : stock > 0 ? 9999 : 0;
      const lastSold = soldMap30[v.variantId]?.lastSold
        ? new Date(soldMap30[v.variantId].lastSold).toISOString().slice(0, 10)
        : null;
      const daysSince = lastSold
        ? Math.floor((now.getTime() - new Date(lastSold).getTime()) / 86400000)
        : 9999;

      let bucket: string;
      if (stock === 0) bucket = 'het_hang';
      else if (doi < 7) bucket = 'thap';
      else if (doi <= 90) bucket = 'tot';
      else bucket = 'ton_kho';

      return this.inventoryRepo.create({
        variantId: v.variantId,
        stockQty: stock,
        lowStockThreshold: Number(v.threshold),
        avgDailySold30d: Math.round(avg30 * 100) / 100,
        avgDailySold90d: Math.round(avg90 * 100) / 100,
        daysOfInventory: doi === 9999 ? 9999 : doi,
        bucket,
        estimatedStockValue: Math.round(stock * Number(v.salePrice)),
        lastSoldDate: lastSold,
        daysSinceLastSold: daysSince === 9999 ? 9999 : daysSince,
        computedAt: now,
      });
    });

    await this.dataSource.query('TRUNCATE TABLE report_inventory_health');
    await this.inventoryRepo.save(snapshots, { chunk: 500 });
    return snapshots.length;
  }

  async computeRetentionCohort(): Promise<number> {
    const now = new Date();
    const cohorts = await this.dataSource
      .createQueryBuilder()
      .select("DATE_FORMAT(kh.ngay_dang_ky, '%Y-%m')", 'cohortMonth')
      .addSelect('COUNT(DISTINCT kh.khach_hang_id)', 'initial')
      .from('khach_hang', 'kh')
      .where("kh.trang_thai = 'HoatDong'")
      .groupBy('cohortMonth')
      .orderBy('cohortMonth', 'DESC')
      .limit(13)
      .getRawMany();

    const snapshots: RetentionCohort[] = [];

    for (const cohort of cohorts) {
      const row: Partial<RetentionCohort> = {
        cohortMonth: cohort.cohortMonth,
        initialCustomers: Number(cohort.initial),
        m0: 100,
        computedAt: now,
      };

      for (let m = 1; m <= 12; m++) {
        const key = `m${m}` as keyof RetentionCohort;
        const activeRow = await this.dataSource
          .createQueryBuilder()
          .select('COUNT(DISTINCT dh.khach_hang_id)', 'cnt')
          .from('don_hang', 'dh')
          .innerJoin('khach_hang', 'kh', 'kh.khach_hang_id = dh.khach_hang_id')
          .where("DATE_FORMAT(kh.ngay_dang_ky, '%Y-%m') = :cohort", { cohort: cohort.cohortMonth })
          .andWhere(
            "DATE_FORMAT(dh.ngay_dat_hang, '%Y-%m') = DATE_FORMAT(DATE_ADD(STR_TO_DATE(CONCAT(:cohort, '-01'), '%Y-%m-%d'), INTERVAL :m MONTH), '%Y-%m')",
            { cohort: cohort.cohortMonth, m },
          )
          .getRawOne();

        const pct =
          Number(cohort.initial) > 0
            ? Math.round((Number(activeRow.cnt) / Number(cohort.initial)) * 100)
            : null;
        (row as any)[key] = pct;
      }

      snapshots.push(this.cohortRepo.create(row as RetentionCohort));
    }

    await this.cohortRepo.upsert(snapshots, { conflictPaths: ['cohortMonth'] });
    return snapshots.length;
  }
}
