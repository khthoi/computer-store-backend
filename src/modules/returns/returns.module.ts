import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReturnRequest } from './entities/return-request.entity';
import { ReturnAsset } from './entities/return-asset.entity';
import { ReturnRequestItem } from './entities/return-request-item.entity';
import { ReturnResolution } from './entities/return-resolution.entity';
import { ReturnsService } from './returns.service';
import { ReturnsQueryService } from './returns-query.service';
import { ReturnsWorkflowService } from './returns-workflow.service';
import { ReturnsResolutionService } from './returns-resolution.service';
import { ReturnsWarrantyService } from './returns-warranty.service';
import { ReturnsController } from './returns.controller';
import { AdminReturnsController } from './admin-returns.controller';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReturnRequest, ReturnAsset, ReturnRequestItem, ReturnResolution]),
    LoyaltyModule,
    AuditLogsModule,
    MediaModule,
  ],
  controllers: [ReturnsController, AdminReturnsController],
  providers: [
    ReturnsQueryService,
    ReturnsWorkflowService,
    ReturnsResolutionService,
    ReturnsWarrantyService,
    ReturnsService,
  ],
  exports: [ReturnsService],
})
export class ReturnsModule {}
