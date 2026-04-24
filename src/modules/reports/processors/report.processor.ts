import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { ReportsComputeService } from '../reports-compute.service';
import { RedisService } from '../../../common/redis/redis.service';
import { CACHE_KEYS } from '../reports-query.service';

export const REPORT_QUEUE = 'report';

export const REPORT_JOBS = {
  DAILY_REVENUE: 'daily_revenue',
  RFM_SNAPSHOT: 'rfm_snapshot',
  INVENTORY_HEALTH: 'inventory_health',
  RETENTION_COHORT: 'retention_cohort',
} as const;

@Processor(REPORT_QUEUE)
export class ReportProcessor {
  constructor(
    private readonly computeService: ReportsComputeService,
    private readonly redisService: RedisService,
  ) {}

  @Process(REPORT_JOBS.DAILY_REVENUE)
  async handleDailyRevenue(_job: Job): Promise<void> {
    const yesterday = this.daysAgo(1);
    const log = await this.computeService.startJobLog(REPORT_JOBS.DAILY_REVENUE);
    try {
      const rows = await this.computeService.computeDailyRevenue(yesterday);
      await this.computeService.finishJobLog(log, rows);
      // Invalidate all revenue + top-products caches (wildcard not supported by ioredis set;
      // use pattern-based delete via SCAN instead — or accept stale cache until next TTL expiry)
    } catch (err) {
      await this.computeService.failJobLog(log, String(err));
    }
  }

  @Process(REPORT_JOBS.RFM_SNAPSHOT)
  async handleRfmSnapshot(_job: Job): Promise<void> {
    const log = await this.computeService.startJobLog(REPORT_JOBS.RFM_SNAPSHOT);
    try {
      const rows = await this.computeService.computeRfmSnapshot();
      await this.computeService.finishJobLog(log, rows);
      await this.invalidateRfmCache();
    } catch (err) {
      await this.computeService.failJobLog(log, String(err));
    }
  }

  @Process(REPORT_JOBS.INVENTORY_HEALTH)
  async handleInventoryHealth(_job: Job): Promise<void> {
    const log = await this.computeService.startJobLog(REPORT_JOBS.INVENTORY_HEALTH);
    try {
      const rows = await this.computeService.computeInventoryHealth();
      await this.computeService.finishJobLog(log, rows);
      await this.invalidateInventoryCache();
    } catch (err) {
      await this.computeService.failJobLog(log, String(err));
    }
  }

  @Process(REPORT_JOBS.RETENTION_COHORT)
  async handleRetentionCohort(_job: Job): Promise<void> {
    const log = await this.computeService.startJobLog(REPORT_JOBS.RETENTION_COHORT);
    try {
      const rows = await this.computeService.computeRetentionCohort();
      await this.computeService.finishJobLog(log, rows);
      await this.redisService.invalidate(CACHE_KEYS.retention());
    } catch (err) {
      await this.computeService.failJobLog(log, String(err));
    }
  }

  private async invalidateRfmCache(): Promise<void> {
    await this.redisService.invalidate(CACHE_KEYS.rfmSummary());
    // Individual paginated rfm keys expire naturally via TTL (30 min)
  }

  private async invalidateInventoryCache(): Promise<void> {
    // Paginated inventory keys expire naturally via TTL (15 min)
    // No single key to invalidate — acceptable for nightly computed data
  }

  private daysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }
}
