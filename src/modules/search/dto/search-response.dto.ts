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

export class QuickSuggestionVariantDto {
  @ApiProperty({ example: 12 })
  variantId: number;

  @ApiProperty({ example: 'Intel Core i9-14900K Box' })
  name: string;

  @ApiProperty({ example: 15000000 })
  price: number;

  @ApiProperty({ example: 'CPU-I9-14900K-BOX' })
  sku: string;

  @ApiProperty({ example: 'HienThi' })
  status: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/variant-12.jpg', nullable: true })
  mediaUrl: string | null;
}

export class QuickSuggestionProductDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Intel Core i9-14900K' })
  name: string;

  @ApiProperty({ example: 'intel-core-i9-14900k' })
  slug: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/product-1.jpg', nullable: true })
  thumbnailUrl: string | null;

  @ApiProperty({ example: 'Intel' })
  brandName: string;

  @ApiProperty({ example: 'CPU Intel' })
  categoryName: string;

  @ApiProperty({ example: 3 })
  variantCount: number;

  @ApiProperty({ type: [QuickSuggestionVariantDto] })
  topVariants: QuickSuggestionVariantDto[];
}

export class QuickSuggestionVariantStandaloneDto extends QuickSuggestionVariantDto {
  @ApiProperty({ example: 1 })
  productId: number;

  @ApiProperty({ example: 'Intel Core i9-14900K' })
  productName: string;

  @ApiProperty({ example: 'intel-core-i9-14900k' })
  productSlug: string;
}

export class QuickSuggestionBrandDto {
  @ApiProperty({ example: 5 })
  id: number;

  @ApiProperty({ example: 'Intel' })
  name: string;

  @ApiProperty({ example: 'intel' })
  slug: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/brands/intel.svg', nullable: true })
  logoUrl: string | null;
}

export class QuickSuggestionCategoryDto {
  @ApiProperty({ example: 10 })
  id: number;

  @ApiProperty({ example: 'CPU Intel' })
  name: string;

  @ApiProperty({ example: 'cpu-intel' })
  slug: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/categories/cpu.svg', nullable: true })
  iconUrl: string | null;
}

export class QuickSuggestionResponseDto {
  @ApiProperty({ example: 'intel' })
  query: string;

  @ApiProperty({ type: [QuickSuggestionProductDto] })
  products: QuickSuggestionProductDto[];

  @ApiProperty({ type: [QuickSuggestionVariantStandaloneDto] })
  variants: QuickSuggestionVariantStandaloneDto[];

  @ApiProperty({ type: [QuickSuggestionBrandDto] })
  brands: QuickSuggestionBrandDto[];

  @ApiProperty({ type: [QuickSuggestionCategoryDto] })
  categories: QuickSuggestionCategoryDto[];

  @ApiProperty({ example: 42 })
  totalProductMatches: number;

  @ApiProperty({ example: 8 })
  totalVariantMatches: number;

  @ApiProperty({ example: 3 })
  totalBrandMatches: number;

  @ApiProperty({ example: 2 })
  totalCategoryMatches: number;
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
