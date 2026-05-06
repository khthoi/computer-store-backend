import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promotion } from './entities/promotion.entity';
import { PromotionScope } from './entities/promotion-scope.entity';
import { PromotionCondition } from './entities/promotion-condition.entity';
import { PromotionAction } from './entities/promotion-action.entity';
import { PromotionUsage } from './entities/promotion-usage.entity';
import { BulkTier } from './entities/bulk-tier.entity';
import { BulkComponent } from './entities/bulk-component.entity';
import { LoyaltyRedemption } from '../loyalty/entities/loyalty-redemption.entity';
import { RedemptionCatalog } from '../loyalty/entities/redemption-catalog.entity';
import { PromotionsService } from './promotions.service';
import { PromotionEvaluatorService } from './promotion-evaluator.service';
import { PromotionsController } from './promotions.controller';
import { AdminPromotionsController } from './admin-promotions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Promotion,
      PromotionScope,
      PromotionCondition,
      PromotionAction,
      PromotionUsage,
      BulkTier,
      BulkComponent,
      LoyaltyRedemption,
      RedemptionCatalog,
    ]),
  ],
  controllers: [PromotionsController, AdminPromotionsController],
  providers: [PromotionsService, PromotionEvaluatorService],
  exports: [PromotionsService, PromotionEvaluatorService],
})
export class PromotionsModule {}
