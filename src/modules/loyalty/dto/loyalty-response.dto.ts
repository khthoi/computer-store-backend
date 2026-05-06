import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EarnRuleScopeResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: '2' })
  ruleId: string;

  @ApiProperty({ enum: ['category', 'brand', 'product'], example: 'category' })
  scopeType: 'category' | 'brand' | 'product';

  @ApiProperty({ example: '3' })
  scopeRefId: string;

  @ApiProperty({ example: 'Laptop' })
  scopeRefLabel: string;

  @ApiProperty({ example: 2.0 })
  multiplier: number;
}

export class EarnRuleResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Quy tắc tích điểm mặc định' })
  name: string;

  @ApiPropertyOptional({ example: 'Tích 1 điểm cho mỗi 100.000đ chi tiêu' })
  description: string | null;

  @ApiProperty({ example: 1 })
  pointsPerUnit: number;

  @ApiProperty({ example: 100000 })
  spendPerUnit: number;

  @ApiPropertyOptional({ example: 200000 })
  minOrderValue: number | null;

  @ApiPropertyOptional({ example: 500 })
  maxPointsPerOrder: number | null;

  @ApiPropertyOptional({ example: 'first_order', enum: ['first_order', 'birthday', 'manual'] })
  bonusTrigger: string | null;

  @ApiPropertyOptional({ example: 100 })
  bonusPoints: number | null;

  @ApiProperty({ type: [EarnRuleScopeResponseDto] })
  scopes: EarnRuleScopeResponseDto[];

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 10 })
  priority: number;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  validFrom: Date | null;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59.000Z' })
  validUntil: Date | null;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;
}

export class LoyaltyTransactionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 12 })
  customerId: number;

  @ApiProperty({ example: 'earn', enum: ['earn', 'redeem', 'expire', 'adjust'] })
  transactionType: string;

  @ApiProperty({ example: 50 })
  points: number;

  @ApiProperty({ example: 100 })
  balanceBefore: number;

  @ApiProperty({ example: 150 })
  balanceAfter: number;

  @ApiProperty({ example: 'Tích điểm đơn hàng #42' })
  description: string;

  @ApiPropertyOptional({ example: 'don_hang' })
  referenceType: string | null;

  @ApiPropertyOptional({ example: 42 })
  referenceId: number | null;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;
}

export class RedemptionCatalogResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Voucher giảm 50.000đ' })
  name: string;

  @ApiPropertyOptional({ example: 'Dùng cho đơn hàng từ 500.000đ' })
  description: string | null;

  @ApiProperty({ example: 200 })
  pointsRequired: number;

  @ApiProperty({ example: '3', description: 'ID của promotion liên kết (is_coupon=true)' })
  promotionId: string;

  @ApiPropertyOptional({ example: 'SUMMER20' })
  promotionCode?: string;

  @ApiPropertyOptional({ example: 'Summer Sale 20% Off' })
  promotionName?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: 100 })
  stockLimit: number | null;

  @ApiProperty({ example: 15 })
  redeemed: number;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  validFrom: Date | null;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59.000Z' })
  validUntil: Date | null;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;
}

export class LoyaltyRedemptionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 12 })
  customerId: number;

  @ApiProperty({ example: 3 })
  catalogId: number;

  @ApiProperty({ example: 'Voucher giảm 50.000đ' })
  nameSnapshot: string;

  @ApiProperty({ example: 200 })
  pointsRedeemed: number;

  @ApiProperty({ example: 'VOUCHER2024' })
  couponCode: string;

  @ApiProperty({ example: 'completed', enum: ['completed', 'cancelled', 'expired'] })
  status: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  redeemedAt: Date;
}
