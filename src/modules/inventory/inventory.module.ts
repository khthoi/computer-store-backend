import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { StockLevel } from './entities/stock-level.entity';
import { StockHistory } from './entities/stock-history.entity';
import { ImportReceipt } from './entities/import-receipt.entity';
import { ImportReceiptItem } from './entities/import-receipt-item.entity';
import { StockBatch } from './entities/stock-batch.entity';
import { ExportReceipt } from './entities/export-receipt.entity';
import { ExportReceiptItem } from './entities/export-receipt-item.entity';
import { InventorySettings } from './entities/inventory-settings.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { InventoryHealthReport } from '../reports/entities/inventory-health-report.entity';
import { InventoryService } from './inventory.service';
import { InventoryImportsService } from './inventory-imports.service';
import { InventoryExportsService } from './inventory-exports.service';
import { InventoryHistoryService } from './inventory-history.service';
import { InventoryKpiService } from './inventory-kpi.service';
import { BatchService } from './batch.service';
import { InventoryController } from './inventory.controller';
import { AdminInventoryController } from './admin-inventory.controller';
import { LowStockProcessor, LOW_STOCK_QUEUE } from './processors/low-stock.processor';
import { LowStockScheduler } from './low-stock.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StockLevel,
      StockHistory,
      ImportReceipt,
      ImportReceiptItem,
      ExportReceipt,
      ExportReceiptItem,
      StockBatch,
      InventorySettings,
      Employee,
      Supplier,
      InventoryHealthReport,
    ]),
    BullModule.registerQueue({ name: LOW_STOCK_QUEUE }),
  ],
  controllers: [InventoryController, AdminInventoryController],
  providers: [
    InventoryService,
    InventoryImportsService,
    InventoryExportsService,
    InventoryHistoryService,
    InventoryKpiService,
    BatchService,
    LowStockProcessor,
    LowStockScheduler,
  ],
  exports: [InventoryService, BatchService, InventoryExportsService],
})
export class InventoryModule {}
