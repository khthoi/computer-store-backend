import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WishlistVariantDto {
  @ApiProperty({ example: 5 })
  variantId: number;

  @ApiProperty({ example: 'Intel Core i9-14900K Box' })
  variantName: string;

  @ApiProperty({ example: 'CPU-I9-14900K-BOX' })
  sku: string;

  @ApiProperty({ example: 15000000 })
  price: number;

  @ApiProperty({ example: 17000000 })
  originalPrice: number;

  @ApiProperty({ example: 'DangBan' })
  status: string;

  @ApiProperty({ example: 'Intel Core i9-14900K' })
  productName: string;

  @ApiProperty({ example: 'intel-core-i9-14900k' })
  slug: string;

  @ApiProperty({ example: 50 })
  stock: number;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/variant-5.jpg', nullable: true })
  imageUrl: string | null;

  @ApiPropertyOptional({ example: 'CPU' })
  categoryName: string | null;

  @ApiProperty({ example: ['Intel'], type: [String] })
  brands: string[];
}

export class WishlistItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 5 })
  variantId: number;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  addedAt: Date;

  @ApiPropertyOptional({ type: () => WishlistVariantDto })
  variant: WishlistVariantDto | null;
}

export class WishlistResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ type: [WishlistItemResponseDto] })
  items: WishlistItemResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}
