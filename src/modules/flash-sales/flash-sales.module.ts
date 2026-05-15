import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlashSale } from './entities/flash-sale.entity';
import { FlashSaleItem } from './entities/flash-sale-item.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { FlashSalesService } from './flash-sales.service';
import { FlashSalesController } from './flash-sales.controller';
import { AdminFlashSalesController } from './admin-flash-sales.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FlashSale, FlashSaleItem, ProductVariant]),
    AuditLogsModule,
  ],
  controllers: [FlashSalesController, AdminFlashSalesController],
  providers: [FlashSalesService],
  exports: [FlashSalesService],
})
export class FlashSalesModule {}
