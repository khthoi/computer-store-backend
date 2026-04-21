import {
  IsString, IsEnum, IsBoolean, IsOptional, IsInt, IsDate, IsArray, ValidateNested, IsNumber, Min, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PromotionType, PromotionStatus, StackingPolicy } from '../entities/promotion.entity';
import { ScopeType } from '../entities/promotion-scope.entity';
import { ConditionType, ConditionOperator } from '../entities/promotion-condition.entity';
import { ActionType, ApplicationLevel } from '../entities/promotion-action.entity';

export class CreateScopeDto {
  @ApiProperty({ enum: ScopeType, example: ScopeType.CATEGORY })
  @IsEnum(ScopeType)
  scopeType: ScopeType;

  @ApiPropertyOptional({ example: '5' })
  @IsOptional() @IsString()
  scopeRefId?: string;

  @ApiPropertyOptional({ example: 'Laptop' })
  @IsOptional() @IsString()
  scopeRefLabel?: string;
}

export class CreateConditionDto {
  @ApiProperty({ enum: ConditionType, example: ConditionType.MIN_ORDER_VALUE })
  @IsEnum(ConditionType)
  type: ConditionType;

  @ApiProperty({ enum: ConditionOperator, example: ConditionOperator.GTE })
  @IsEnum(ConditionOperator)
  operator: ConditionOperator;

  @ApiProperty({ example: '500000' })
  @IsString()
  value: string;
}

export class CreateBulkTierDto {
  @ApiProperty({ example: 3 })
  @IsInt() @Min(1)
  minQuantity: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional() @IsInt()
  maxQuantity?: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  discountValue: number;

  @ApiProperty({ enum: ['percentage', 'fixed'], example: 'percentage' })
  @IsEnum(['percentage', 'fixed'])
  discountType: 'percentage' | 'fixed';
}

export class CreateBulkComponentDto {
  @ApiProperty({ enum: ['category', 'product', 'variant'], example: 'product' })
  @IsEnum(['category', 'product', 'variant'])
  scope: 'category' | 'product' | 'variant';

  @ApiProperty({ example: '12' })
  @IsString()
  refId: string;

  @ApiPropertyOptional({ example: 'CPU Intel i9' })
  @IsOptional() @IsString()
  refLabel?: string;

  @ApiProperty({ example: 1 })
  @IsInt() @Min(1)
  minQuantity: number;
}

export class CreateActionDto {
  @ApiProperty({ enum: ActionType, example: ActionType.PERCENTAGE_DISCOUNT })
  @IsEnum(ActionType)
  actionType: ActionType;

  @ApiProperty({ enum: ApplicationLevel, example: ApplicationLevel.CART_TOTAL })
  @IsEnum(ApplicationLevel)
  applicationLevel: ApplicationLevel;

  @ApiPropertyOptional({ enum: ['percentage', 'fixed'], example: 'percentage' })
  @IsOptional() @IsEnum(['percentage', 'fixed'])
  discountType?: 'percentage' | 'fixed';

  @ApiPropertyOptional({ example: 10 })
  @IsOptional() @IsNumber()
  discountValue?: number;

  @ApiPropertyOptional({ example: 200000 })
  @IsOptional() @IsNumber()
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional() @IsInt()
  bxgyBuyQty?: number;

  @ApiPropertyOptional({ example: '5' })
  @IsOptional() @IsString()
  bxgyBuyProductId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @IsInt()
  bxgyGetQty?: number;

  @ApiPropertyOptional({ example: '5' })
  @IsOptional() @IsString()
  bxgyGetProductId?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional() @IsInt()
  bxgyGetDiscountPct?: number;

  @ApiPropertyOptional({ enum: ['auto_add', 'customer_selects'] })
  @IsOptional() @IsEnum(['auto_add', 'customer_selects'])
  bxgyDeliveryMode?: 'auto_add' | 'customer_selects';

  @ApiPropertyOptional({ example: 3 })
  @IsOptional() @IsInt()
  bxgyMaxApplications?: number;

  @ApiPropertyOptional({ example: '[5,6,7]' })
  @IsOptional() @IsString()
  bxgyEligibleProductIds?: string;

  @ApiPropertyOptional({ type: [CreateBulkTierDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateBulkTierDto)
  bulkTiers?: CreateBulkTierDto[];

  @ApiPropertyOptional({ type: [CreateBulkComponentDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateBulkComponentDto)
  bulkComponents?: CreateBulkComponentDto[];
}

export class CreatePromotionDto {
  @ApiProperty({ example: 'Giảm 10% toàn bộ Laptop' })
  @IsString() @MaxLength(300)
  name: string;

  @ApiPropertyOptional({ example: 'Áp dụng cho đơn từ 5 triệu' })
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ enum: PromotionType, example: PromotionType.STANDARD })
  @IsEnum(PromotionType)
  type: PromotionType;

  @ApiProperty({ example: false, description: 'true = cần nhập code, false = auto-apply' })
  @IsBoolean()
  isCoupon: boolean;

  @ApiPropertyOptional({ example: 'SUMMER10' })
  @IsOptional() @IsString() @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ enum: PromotionStatus, default: PromotionStatus.DRAFT })
  @IsOptional() @IsEnum(PromotionStatus)
  status?: PromotionStatus;

  @ApiProperty({ example: 10, description: 'Thứ tự ưu tiên khi auto-apply' })
  @IsInt() @Min(0)
  priority: number;

  @ApiProperty({ enum: StackingPolicy, example: StackingPolicy.EXCLUSIVE })
  @IsEnum(StackingPolicy)
  stackingPolicy: StackingPolicy;

  @ApiProperty({ example: '2026-05-01T00:00:00Z' })
  @Type(() => Date) @IsDate()
  startDate: Date;

  @ApiProperty({ example: '2026-05-31T23:59:59Z' })
  @Type(() => Date) @IsDate()
  endDate: Date;

  @ApiPropertyOptional({ example: 1000, description: 'null = không giới hạn' })
  @IsOptional() @IsInt() @Min(1)
  totalUsageLimit?: number;

  @ApiPropertyOptional({ example: 1, description: 'Giới hạn lượt dùng mỗi khách' })
  @IsOptional() @IsInt() @Min(1)
  perCustomerLimit?: number;

  @ApiPropertyOptional({ type: [CreateScopeDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateScopeDto)
  scopes?: CreateScopeDto[];

  @ApiPropertyOptional({ type: [CreateConditionDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateConditionDto)
  conditions?: CreateConditionDto[];

  @ApiPropertyOptional({ type: [CreateActionDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateActionDto)
  actions?: CreateActionDto[];
}
