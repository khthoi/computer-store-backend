import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DailyRevenueReport } from './entities/daily-revenue-report.entity';
import { RfmSnapshot } from './entities/rfm-snapshot.entity';
import { RetentionCohort } from './entities/retention-cohort.entity';
import { InventoryHealthReport } from './entities/inventory-health-report.entity';
import { ReportJobLog } from './entities/report-job-log.entity';
import { RedisService } from '../../common/redis/redis.service';
import { QueryRevenueDto } from './dto/query-revenue.dto';
import { QueryTopProductsDto } from './dto/query-top-products.dto';
import { QueryRfmDto } from './dto/query-rfm.dto';
import { QueryInventoryHealthDto } from './dto/query-inventory-health.dto';

export const CACHE_KEYS = {
  revenue: (s: string, e: string) => `reports:revenue:${s}:${e}`,
  topProducts: (period: string, limit: number) => `reports:top-products:${period}:${limit}`,
  rfmSummary: () => `reports:rfm:summary`,
  rfmCustomers: (seg: string, p: number, l: number) => `reports:rfm:customers:${seg}:${p}:${l}`,
  inventoryHealth: (bucket: string, p: number, l: number) => `reports:inventory:${bucket}:${p}:${l}`,
  retention: () => `reports:retention`,
};

@Injectable()
export class ReportsQueryService {
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
    private readonly redisService: RedisService,
  ) {}

  async getRevenue(dto: QueryRevenueDto) {
    const start = dto.startDate ?? this.daysAgo(30);
    const end = dto.endDate ?? this.today();
    const cacheKey = CACHE_KEYS.revenue(start, end);

    return this.redisService.cache(cacheKey, 300, async () => {
      const rows = await this.revenueRepo
        .createQueryBuilder('r')
        .where('r.date BETWEEN :start AND :end', { start, end })
        .orderBy('r.date', 'ASC')
        .getMany();

      const summary = rows.reduce(
        (acc, r) => ({
          totalGmv: acc.totalGmv + Number(r.gmv),
          totalNetRevenue: acc.totalNetRevenue + Number(r.netRevenue),
          totalOrders: acc.totalOrders + r.ordersPlaced,
          totalCompleted: acc.totalCompleted + r.ordersCompleted,
        }),
        { totalGmv: 0, totalNetRevenue: 0, totalOrders: 0, totalCompleted: 0 },
      );

      return { summary, data: rows };
    });
  }

  async getTopProducts(dto: QueryTopProductsDto) {
    const period = dto.period ?? '30d';
    const limit = dto.limit ?? 10;
    const cacheKey = CACHE_KEYS.topProducts(period, limit);

    return this.redisService.cache(cacheKey, 600, async () => {
      const days = parseInt(period.replace('d', ''), 10);
      const since = this.daysAgo(days);

      const rows = await this.dataSource
        .createQueryBuilder()
        .select('v.phien_ban_id', 'variantId')
        .addSelect('v.SKU', 'sku')
        .addSelect('v.ten_phien_ban', 'variantName')
        .addSelect('sp.ten_san_pham', 'productName')
        .addSelect('SUM(od.so_luong)', 'totalSold')
        .addSelect('SUM(od.thanh_tien_snapshot)', 'totalRevenue')
        .from('chi_tiet_don_hang', 'od')
        .innerJoin('don_hang', 'dh', 'dh.don_hang_id = od.don_hang_id')
        .innerJoin('phien_ban_san_pham', 'v', 'v.phien_ban_id = od.phien_ban_id')
        .innerJoin('san_pham', 'sp', 'sp.san_pham_id = v.san_pham_id')
        .where("dh.trang_thai_don = 'DaGiao'")
        .andWhere('dh.ngay_dat_hang >= :since', { since })
        .groupBy('v.phien_ban_id')
        .orderBy('totalSold', 'DESC')
        .limit(limit)
        .getRawMany();

      return rows;
    });
  }

  async getRfmSummary() {
    return this.redisService.cache(CACHE_KEYS.rfmSummary(), 1800, async () => {
      const rows = await this.rfmRepo
        .createQueryBuilder('r')
        .select('r.segment', 'segment')
        .addSelect('COUNT(*)', 'count')
        .addSelect('AVG(r.monetary)', 'avgMonetary')
        .groupBy('r.segment')
        .orderBy('count', 'DESC')
        .getRawMany();

      return rows;
    });
  }

  async getRfmCustomers(dto: QueryRfmDto) {
    const segment = dto.segment ?? '';
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const cacheKey = CACHE_KEYS.rfmCustomers(segment, page, limit);

    return this.redisService.cache(cacheKey, 1800, async () => {
      const qb = this.rfmRepo
        .createQueryBuilder('r')
        .innerJoin('khach_hang', 'kh', 'kh.khach_hang_id = r.khach_hang_id')
        .addSelect('kh.ho_ten', 'fullName')
        .addSelect('kh.email', 'email')
        .orderBy('r.monetary', 'DESC');

      if (segment) qb.where('r.segment = :segment', { segment });

      const [items, total] = await Promise.all([
        qb.skip((page - 1) * limit).take(limit).getRawMany(),
        qb.getCount(),
      ]);

      return { items, total, page, limit };
    });
  }

  async getInventoryHealth(dto: QueryInventoryHealthDto) {
    const bucket = dto.bucket ?? '';
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const cacheKey = CACHE_KEYS.inventoryHealth(bucket, page, limit);

    return this.redisService.cache(cacheKey, 900, async () => {
      const qb = this.inventoryRepo
        .createQueryBuilder('ih')
        .innerJoin('phien_ban_san_pham', 'v', 'v.phien_ban_id = ih.phien_ban_id')
        .addSelect('v.SKU', 'sku')
        .addSelect('v.ten_phien_ban', 'variantName')
        .innerJoin('san_pham', 'sp', 'sp.san_pham_id = v.san_pham_id')
        .addSelect('sp.ten_san_pham', 'productName')
        .orderBy('ih.daysOfInventory', 'ASC');

      if (bucket) qb.where('ih.bucket = :bucket', { bucket });

      const [items, total] = await Promise.all([
        qb.skip((page - 1) * limit).take(limit).getRawMany(),
        qb.getCount(),
      ]);

      return { items, total, page, limit };
    });
  }

  async getRetentionCohort() {
    return this.redisService.cache(CACHE_KEYS.retention(), 3600, async () => {
      return this.cohortRepo.find({ order: { cohortMonth: 'DESC' } });
    });
  }

  async getJobLogs(limit = 20) {
    return this.jobLogRepo.find({
      order: { startedAt: 'DESC' },
      take: limit,
    });
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
