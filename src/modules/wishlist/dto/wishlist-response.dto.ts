import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WishlistVariantDto {
  @ApiProperty({ example: 5 })
  variantId: number;

  @ApiProperty({ example: 'Intel Core i9-14900K Box' })
  variantName: string;

  @ApiProperty({ example: 15000000 })
  price: number;

  @ApiProperty({ example: 'DangBan' })
  status: string;

  @ApiProperty({ example: 'Intel Core i9-14900K' })
  productName: string;

  @ApiProperty({ example: 'intel-core-i9-14900k' })
  slug: string;

  @ApiProperty({ example: 50 })
  stock: number;
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
}
