import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { LOW_STOCK_QUEUE, LOW_STOCK_JOB } from './processors/low-stock.processor';

@Injectable()
export class LowStockScheduler implements OnModuleInit {
  constructor(
    @InjectQueue(LOW_STOCK_QUEUE) private readonly lowStockQueue: Queue,
  ) {}

  async onModuleInit() {
    // Clear stale repeatable jobs from previous deploys before re-registering
    const repeatable = await this.lowStockQueue.getRepeatableJobs();
    for (const job of repeatable) {
      await this.lowStockQueue.removeRepeatableByKey(job.key);
    }

    await this.lowStockQueue.add(
      LOW_STOCK_JOB,
      {},
      { repeat: { cron: '0 * * * *' }, removeOnComplete: true },
    );
  }
}
