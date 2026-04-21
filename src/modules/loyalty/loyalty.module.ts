import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltyEarnRule } from './entities/loyalty-earn-rule.entity';
import { LoyaltyEarnRuleScope } from './entities/loyalty-earn-rule-scope.entity';
import { LoyaltyTransaction } from './entities/loyalty-transaction.entity';
import { RedemptionCatalog } from './entities/redemption-catalog.entity';
import { LoyaltyRedemption } from './entities/loyalty-redemption.entity';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyController } from './loyalty.controller';
import { AdminLoyaltyController } from './admin-loyalty.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LoyaltyEarnRule,
      LoyaltyEarnRuleScope,
      LoyaltyTransaction,
      RedemptionCatalog,
      LoyaltyRedemption,
    ]),
  ],
  controllers: [LoyaltyController, AdminLoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
