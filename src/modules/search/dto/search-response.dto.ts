import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchResultItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Intel Core i9-14900K' })
  name: string;

  @ApiProperty({ example: 'intel-core-i9-14900k' })
  slug: string;

  @ApiProperty({ example: 4.8 })
  avgRating: number;

  @ApiProperty({ example: 120 })
  reviewCount: number;

  @ApiProperty({ example: 5 })
  variantId: number;

  @ApiProperty({ example: 15000000 })
  price: number;

  @ApiProperty({ example: 'DangBan' })
  variantStatus: string;
}

export class SearchResultDto {
  @ApiProperty({ type: [SearchResultItemDto] })
  items: SearchResultItemDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}

export class SuggestionDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Intel Core i9-14900K' })
  name: string;

  @ApiProperty({ example: 'intel-core-i9-14900k' })
  slug: string;
}

export class ViewHistoryItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 5 })
  variantId: number;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  viewedAt: Date;

  @ApiProperty({ example: 'Intel Core i9-14900K Box' })
  variantName: string;

  @ApiProperty({ example: 15000000 })
  price: number;

  @ApiProperty({ example: 'Intel Core i9-14900K' })
  productName: string;

  @ApiProperty({ example: 'intel-core-i9-14900k' })
  slug: string;
}
