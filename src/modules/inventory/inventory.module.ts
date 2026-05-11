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
import { InventoryService } from './services/inventory.service';
import { InventoryImportsService } from './services/inventory-imports.service';
import { InventoryExportsService } from './services/inventory-exports.service';
import { InventoryHistoryService } from './services/inventory-history.service';
import { InventoryKpiService } from './services/inventory-kpi.service';
import { BatchService } from './services/batch.service';
import { InventoryController } from './controllers/inventory.controller';
import { AdminInventoryController } from './controllers/admin-inventory.controller';
import { LowStockProcessor, LOW_STOCK_QUEUE } from './processors/low-stock.processor';
import { LowStockScheduler } from './schedulers/low-stock.scheduler';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

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
    AuditLogsModule,
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
