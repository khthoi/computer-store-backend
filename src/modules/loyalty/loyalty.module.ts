import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltyEarnRule } from './entities/loyalty-earn-rule.entity';
import { LoyaltyEarnRuleScope } from './entities/loyalty-earn-rule-scope.entity';
import { LoyaltyTransaction } from './entities/loyalty-transaction.entity';
import { RedemptionCatalog } from './entities/redemption-catalog.entity';
import { LoyaltyRedemption } from './entities/loyalty-redemption.entity';
import { MembershipTier } from './entities/membership-tier.entity';
import { LoyaltyService } from './loyalty.service';
import { MembershipTierService } from './membership-tier.service';
import { LoyaltyController } from './loyalty.controller';
import { AdminLoyaltyController } from './admin-loyalty.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    AuditLogsModule,
    TypeOrmModule.forFeature([
      LoyaltyEarnRule,
      LoyaltyEarnRuleScope,
      LoyaltyTransaction,
      RedemptionCatalog,
      LoyaltyRedemption,
      MembershipTier,
    ]),
  ],
  controllers: [LoyaltyController, AdminLoyaltyController],
  providers: [LoyaltyService, MembershipTierService],
  exports: [LoyaltyService, MembershipTierService],
})
export class LoyaltyModule {}
