import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartItemVariantDto {
  @ApiProperty({ example: 5 })
  variantId: number;

  @ApiProperty({ example: 'Intel Core i9-14900K Box' })
  variantName: string;

  @ApiProperty({ example: 'CPU-I9-14900K' })
  sku: string;

  @ApiProperty({ example: 15000000 })
  price: number;

  @ApiProperty({ example: 'DangBan' })
  status: string;

  @ApiProperty({ example: 'Intel Core i9-14900K' })
  productName: string;

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
}
