import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReturnRequest } from './entities/return-request.entity';
import { ReturnAsset } from './entities/return-asset.entity';
import { ReturnRequestItem } from './entities/return-request-item.entity';
import { ReturnResolution } from './entities/return-resolution.entity';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { AdminReturnsController } from './admin-returns.controller';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReturnRequest, ReturnAsset, ReturnRequestItem, ReturnResolution]),
    LoyaltyModule,
  ],
  controllers: [ReturnsController, AdminReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
