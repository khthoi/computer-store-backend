/**
 * Shape that the storefront ProductCard expects.
 * Field names match ProductCardProps in computer-store-client-frontend.
 */
export interface StorefrontVariantOptionDto {
  id: string;
  name: string;
  sku: string;
  price: number;
  originalPrice: number;
  stock: number;
  isDefault: boolean;
  thumbnailUrl: string | null;
}

export interface StorefrontProductCardDto {
  id: string;
  slug: string | null;
  variantId: number;
  name: string;
  brand: string;
  thumbnail: string;
  price: number;
  originalPrice?: number;
  productCode: string;
  rating?: number;
  reviewCount?: number;
  stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
  stockQuantity?: number;
  badge?: string;
  variants: StorefrontVariantOptionDto[];
}

export interface StorefrontHomepageSectionDto {
  sectionId: number;
  title: string;
  subtitle?: string;
  viewAllUrl?: string;
  type: 'category' | 'promotion' | 'brand' | 'manual' | 'new_arrivals' | 'best_selling';
  layout: 'carousel' | 'grid_3' | 'grid_4' | 'grid_6';
  badgeLabel?: string;
  badgeColor?: string;
  badgeTextColor?: string;
  sortOrder: number;
  products: StorefrontProductCardDto[];
}

export interface StorefrontFlashSaleInfoDto {
  id: number;
  name: string;
  startAt: string;
  endAt: string;
  bannerTitle: string | null;
  bannerImageUrl: string | null;
  bannerAlt: string | null;
}

export interface StorefrontFlashSaleResponseDto {
  flashSale: StorefrontFlashSaleInfoDto | null;
  products: StorefrontProductCardDto[];
}

export interface StorefrontPromotionInfoDto {
  id: number;
  name: string;
  endDate: string;
}

export interface StorefrontPromotionProductsDto {
  promotions: StorefrontPromotionInfoDto[];
  products: (StorefrontProductCardDto & { promotionId: number })[];
}
