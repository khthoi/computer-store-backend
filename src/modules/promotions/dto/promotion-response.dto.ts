import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PromotionScopeResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: '7' })
  promotionId: string;

  @ApiProperty({ example: 'category', enum: ['global', 'category', 'product', 'variant', 'brand'] })
  scopeType: string;

  @ApiPropertyOptional({ example: '5' })
  scopeRefId?: string;

  @ApiPropertyOptional({ example: 'Laptop' })
  scopeRefLabel?: string;
}

export class PromotionConditionResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: '7' })
  promotionId: string;

  @ApiProperty({ example: 'min_order_value' })
  type: string;

  @ApiProperty({ example: 'gte' })
  operator: string;

  @ApiProperty({ example: '5000000' })
  value: string;
}

export class BxgyFieldsResponseDto {
  @ApiProperty({ example: 2 })
  buyQuantity: number;

  @ApiPropertyOptional({ example: '5' })
  buyProductId?: string;

  @ApiPropertyOptional({ example: 'Laptop Gaming' })
  buyProductLabel?: string;

  @ApiProperty({ example: 1 })
  getQuantity: number;

  @ApiPropertyOptional({ example: '5' })
  getProductId?: string;

  @ApiPropertyOptional({ example: 'Laptop Gaming' })
  getProductLabel?: string;

  @ApiProperty({ example: 100 })
  getDiscountPercent: number;

  @ApiProperty({ example: 'auto_add', enum: ['auto_add', 'customer_selects'] })
  deliveryMode: string;

  @ApiProperty({ example: 1 })
  maxApplicationsPerOrder: number;

  @ApiPropertyOptional({ type: [String], example: ['5', '6'] })
  eligibleFreeProductIds?: string[];
}

export class BulkTierResponseDto {
  @ApiProperty({ example: 3 })
  minQuantity: number;

  @ApiPropertyOptional({ example: 5 })
  maxQuantity?: number;

  @ApiProperty({ example: 10 })
  discountValue: number;

  @ApiProperty({ example: 'percentage', enum: ['percentage', 'fixed'] })
  discountType: string;
}

export class BundleComponentResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'product', enum: ['category', 'product', 'variant'] })
  scope: string;

  @ApiProperty({ example: '12' })
  refId: string;

  @ApiPropertyOptional({ example: 'CPU Intel i9' })
  refLabel?: string;

  @ApiProperty({ example: 1 })
  minQuantity: number;
}

export class PromotionActionResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: '7' })
  promotionId: string;

  @ApiProperty({ example: 'percentage_discount' })
  actionType: string;

  @ApiProperty({ example: 'cart_total', enum: ['per_item', 'cart_total', 'cheapest_item'] })
  applicationLevel: string;

  @ApiPropertyOptional({ example: 'percentage', enum: ['percentage', 'fixed'] })
  discountType?: string;

  @ApiPropertyOptional({ example: 10 })
  discountValue?: number;

  @ApiPropertyOptional({ example: 500000 })
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ type: BxgyFieldsResponseDto })
  bxgy?: BxgyFieldsResponseDto;

  @ApiPropertyOptional({ type: [BundleComponentResponseDto] })
  requiredComponents?: BundleComponentResponseDto[];

  @ApiPropertyOptional({ type: [BulkTierResponseDto] })
  tiers?: BulkTierResponseDto[];
}

export class PromotionResponseDto {
  @ApiProperty({ example: '7' })
  id: string;

  @ApiProperty({ example: 'Giảm 10% toàn bộ Laptop' })
  name: string;

  @ApiPropertyOptional({ example: 'Áp dụng cho đơn từ 5 triệu' })
  description?: string;

  @ApiProperty({ example: 'standard', enum: ['standard', 'bxgy', 'bundle', 'bulk', 'free_shipping'] })
  type: string;

  @ApiProperty({ example: false })
  isCoupon: boolean;

  @ApiPropertyOptional({ example: 'SUMMER10' })
  code?: string;

  @ApiProperty({ example: 'active', enum: ['draft', 'active', 'scheduled', 'paused', 'ended', 'cancelled'] })
  status: string;

  @ApiProperty({ example: 5 })
  priority: number;

  @ApiProperty({ example: 'exclusive', enum: ['exclusive', 'stackable', 'stackable_with_coupons_only'] })
  stackingPolicy: string;

  @ApiProperty({ example: '2026-05-01T00:00:00.000Z' })
  startDate: string;

  @ApiProperty({ example: '2026-05-31T23:59:59.000Z' })
  endDate: string;

  @ApiPropertyOptional({ example: 1000 })
  totalUsageLimit?: number;

  @ApiPropertyOptional({ example: 1 })
  perCustomerLimit?: number;

  @ApiProperty({ example: 123 })
  usageCount: number;

  @ApiProperty({ type: [PromotionScopeResponseDto] })
  scopes: PromotionScopeResponseDto[];

  @ApiProperty({ type: [PromotionConditionResponseDto] })
  conditions: PromotionConditionResponseDto[];

  @ApiProperty({ type: [PromotionActionResponseDto] })
  actions: PromotionActionResponseDto[];

  @ApiProperty({ example: '3' })
  createdBy: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: string;
}

export class PromotionSummaryResponseDto {
  @ApiProperty({ example: '7' })
  id: string;

  @ApiProperty({ example: 'Giảm 10% toàn bộ Laptop' })
  name: string;

  @ApiProperty({ example: 'standard' })
  type: string;

  @ApiProperty({ example: false })
  isCoupon: boolean;

  @ApiPropertyOptional({ example: 'SUMMER10' })
  code?: string;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiProperty({ example: 5 })
  priority: number;

  @ApiProperty({ example: 'exclusive' })
  stackingPolicy: string;

  @ApiProperty({ example: '2026-05-01T00:00:00.000Z' })
  startDate: string;

  @ApiProperty({ example: '2026-05-31T23:59:59.000Z' })
  endDate: string;

  @ApiPropertyOptional({ example: 1000 })
  totalUsageLimit?: number;

  @ApiPropertyOptional({ example: 1 })
  perCustomerLimit?: number;

  @ApiProperty({ example: 123 })
  usageCount: number;

  @ApiProperty({ example: 'Electronics' })
  scopeDisplay: string;

  @ApiProperty({ example: '10% off' })
  discountDisplay: string;

  @ApiProperty({ example: '3' })
  createdBy: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: string;
}

export class PromotionUsageResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: '7' })
  promotionId: string;

  @ApiProperty({ example: '42' })
  customerId: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  customerName: string;

  @ApiProperty({ example: '101' })
  orderId: string;

  @ApiProperty({ example: 50000 })
  discountAmount: number;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  appliedAt: string;
}

export class PromotionUsageStatsResponseDto {
  @ApiProperty({ example: 123 })
  totalUses: number;

  @ApiProperty({ example: 6150000 })
  totalDiscount: number;

  @ApiProperty({ example: 89 })
  uniqueCustomers: number;
}
