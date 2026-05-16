import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type PromotionSource = 'auto' | 'coupon';
export type PromotionScopeKind = 'global' | 'category' | 'brand' | 'variant';
export type PromotionActionKind = 'percentage' | 'fixed_cart' | 'free_shipping' | 'bulk' | 'other';
export type PromotionStatusKind = 'active' | 'unmet' | 'exhausted';

export class AppliedPromotionDto {
  @ApiProperty({ example: 1 })
  promotionId: number;

  @ApiProperty({ example: 'Giảm 10% Laptop Gaming' })
  name: string;

  @ApiProperty({ enum: ['auto', 'coupon'], example: 'auto' })
  source: PromotionSource;

  @ApiProperty({ enum: ['global', 'category', 'brand', 'variant'], example: 'category' })
  scopeType: PromotionScopeKind;

  @ApiProperty({ example: 'Danh mục: Laptop Gaming' })
  scopeLabel: string;

  @ApiProperty({ enum: ['percentage', 'fixed_cart', 'free_shipping', 'bulk', 'other'], example: 'percentage' })
  actionType: PromotionActionKind;

  @ApiProperty({ example: 'Giảm 10% (tối đa 500.000₫)' })
  mechanic: string;

  @ApiProperty({ example: 250000 })
  discountAmount: number;

  @ApiProperty({ example: ['Đơn tối thiểu 1.000.000₫'] })
  conditions: string[];

  @ApiProperty({ enum: ['active', 'unmet', 'exhausted'], example: 'active' })
  status: PromotionStatusKind;

  @ApiPropertyOptional({ example: 'Thiếu 200.000₫ để đủ điều kiện' })
  unmetReason?: string;

  @ApiPropertyOptional({ example: ['12', '13'] })
  appliedToVariantIds?: string[];

  @ApiPropertyOptional({ example: 'SALE10' })
  couponCode?: string;
}

export class CartItemVariantDto {
  @ApiProperty({ example: 5 })
  variantId: number;

  @ApiProperty({ example: 'Intel Core i9-14900K Box' })
  variantName: string;

  @ApiProperty({ example: 'CPU-I9-14900K' })
  sku: string;

  @ApiProperty({ example: 15000000 })
  price: number;

  @ApiProperty({ example: 17000000 })
  originalPrice: number;

  @ApiProperty({ example: 'DangBan' })
  status: string;

  @ApiProperty({ example: 'Intel Core i9-14900K' })
  productName: string;

  @ApiPropertyOptional({ example: 'intel-core-i9-14900k' })
  slug: string | null;

  @ApiPropertyOptional({ example: 'CPU' })
  categoryName: string | null;

  @ApiProperty({ example: ['Intel'], type: [String] })
  brands: string[];

  @ApiPropertyOptional({ example: 'https://cdn.example.com/img.jpg' })
  thumbnail: string | null;
}

export class CartItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 5 })
  variantId: number;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 15000000 })
  priceAtTime: number;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  addedAt: Date;

  @ApiPropertyOptional({ type: () => CartItemVariantDto })
  variant: CartItemVariantDto | null;
}

export class CartResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 12 })
  customerId: number;

  @ApiPropertyOptional({ example: 'SALE10' })
  couponCode: string | null;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ type: [CartItemResponseDto] })
  items: CartItemResponseDto[];

  @ApiProperty({ example: 15000000 })
  subtotal: number;

  @ApiProperty({ example: 250000 })
  totalDiscount: number;

  @ApiProperty({ example: 14750000 })
  total: number;

  @ApiProperty({ type: [AppliedPromotionDto] })
  appliedPromotions: AppliedPromotionDto[];
}
