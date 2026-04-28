import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderNote } from './entities/order-note.entity';
import { OrderRefund } from './entities/order-refund.entity';
import { OrderRefundItem } from './entities/order-refund-item.entity';
import { OrderActivityLog } from './entities/order-activity-log.entity';
import { OrdersService } from './orders.service';
import { OrdersRefundService } from './orders-refund.service';
import { OrdersReturnsQueryService } from './orders-returns-query.service';
import { OrderActivityLogService } from './order-activity-log.service';
import { OrdersController } from './orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { CartModule } from '../cart/cart.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, OrderNote, OrderRefund, OrderRefundItem, OrderActivityLog]), CartModule, InventoryModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, OrdersRefundService, OrdersReturnsQueryService, OrderActivityLogService],
  exports: [OrdersService],
})
export class OrdersModule {}
