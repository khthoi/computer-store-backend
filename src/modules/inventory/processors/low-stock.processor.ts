import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockLevel } from '../entities/stock-level.entity';

export const LOW_STOCK_QUEUE = 'low-stock';
export const LOW_STOCK_JOB = 'check-low-stock';

@Processor(LOW_STOCK_QUEUE)
export class LowStockProcessor {
  constructor(
    @InjectRepository(StockLevel)
    private readonly stockRepo: Repository<StockLevel>,
  ) {}

  @Process(LOW_STOCK_JOB)
  async checkLowStock(_job: Job): Promise<void> {
    const lowStockItems = await this.stockRepo
      .createQueryBuilder('tk')
      .where('tk.so_luong_ton < tk.nguong_canh_bao')
      .getMany();

    if (lowStockItems.length === 0) return;

    // TODO Phase 7: gọi NotificationsService để tạo thông báo cho admin
    // Tạm thời log để monitor
    console.log(`[LowStock] ${lowStockItems.length} phiên bản dưới ngưỡng cảnh báo`, {
      variantIds: lowStockItems.map((i) => i.phienBanId),
    });
  }
}
