import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FlashSalesService } from './flash-sales.service';

@Injectable()
export class FlashSaleScheduler {
  private readonly logger = new Logger(FlashSaleScheduler.name);

  constructor(private readonly flashSalesService: FlashSalesService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async syncStatuses() {
    try {
      await this.flashSalesService.activateScheduled();
      await this.flashSalesService.endExpired();
    } catch (err) {
      this.logger.error('Flash sale status sync failed', err);
    }
  }
}
