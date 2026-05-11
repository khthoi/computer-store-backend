import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicket } from './entities/support-ticket.entity';
import { TicketMessage } from './entities/ticket-message.entity';
import { TicketAttachment } from './entities/ticket-attachment.entity';
import { SupportService } from './support.service';
import { SupportAdminQueryService } from './support-admin-query.service';
import { SupportScheduler } from './support-scheduler.service';
import { SupportController } from './support.controller';
import { AdminSupportController } from './admin-support.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([SupportTicket, TicketMessage, TicketAttachment]), AuditLogsModule],
  controllers: [SupportController, AdminSupportController],
  providers: [SupportService, SupportAdminQueryService, SupportScheduler],
  exports: [SupportService],
})
export class SupportModule {}
