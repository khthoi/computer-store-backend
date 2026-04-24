import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { REPORT_QUEUE, REPORT_JOBS } from './processors/report.processor';

@Injectable()
export class ReportScheduler implements OnModuleInit {
  constructor(
    @InjectQueue(REPORT_QUEUE) private readonly reportQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    // Clear stale repeatable jobs from previous deploys
    const existing = await this.reportQueue.getRepeatableJobs();
    for (const job of existing) {
      await this.reportQueue.removeRepeatableByKey(job.key);
    }

    await this.reportQueue.add(
      REPORT_JOBS.DAILY_REVENUE,
      {},
      { repeat: { cron: '0 0 * * *' }, removeOnComplete: true },
    );

    await this.reportQueue.add(
      REPORT_JOBS.RFM_SNAPSHOT,
      {},
      { repeat: { cron: '0 1 * * *' }, removeOnComplete: true },
    );

    await this.reportQueue.add(
      REPORT_JOBS.INVENTORY_HEALTH,
      {},
      { repeat: { cron: '0 2 * * *' }, removeOnComplete: true },
    );

    // Monthly: first day of each month at midnight
    await this.reportQueue.add(
      REPORT_JOBS.RETENTION_COHORT,
      {},
      { repeat: { cron: '0 0 1 * *' }, removeOnComplete: true },
    );
  }
}
