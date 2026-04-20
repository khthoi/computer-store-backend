import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Warehouse } from './entities/warehouse.entity';
import { StockLevel } from './entities/stock-level.entity';
import { StockHistory } from './entities/stock-history.entity';
import { ImportReceipt } from './entities/import-receipt.entity';
import { ImportReceiptItem } from './entities/import-receipt-item.entity';
import { InventoryService } from './inventory.service';
import { InventoryImportsService } from './inventory-imports.service';
import { InventoryController } from './inventory.controller';
import { AdminInventoryController } from './admin-inventory.controller';
import { LowStockProcessor, LOW_STOCK_QUEUE } from './processors/low-stock.processor';
import { LowStockScheduler } from './low-stock.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Warehouse, StockLevel, StockHistory, ImportReceipt, ImportReceiptItem]),
    BullModule.registerQueue({ name: LOW_STOCK_QUEUE }),
  ],
  controllers: [InventoryController, AdminInventoryController],
  providers: [InventoryService, InventoryImportsService, LowStockProcessor, LowStockScheduler],
  exports: [InventoryService],
})
export class InventoryModule {}
