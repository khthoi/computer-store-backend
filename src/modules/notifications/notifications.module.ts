import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { AutoNotificationConfig } from './entities/auto-notification-config.entity';
import { Customer } from '../users/entities/customer.entity';
import { MembershipTier } from '../loyalty/entities/membership-tier.entity';
import { Order } from '../orders/entities/order.entity';
import { Transaction } from '../payments/entities/transaction.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsAdminService } from './notifications-admin.service';
import { NotificationsController } from './notifications.controller';
import { AdminNotificationsController } from './admin-notifications.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, AutoNotificationConfig, Customer, MembershipTier, Order, Transaction]), AuditLogsModule],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [NotificationsService, NotificationsAdminService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
