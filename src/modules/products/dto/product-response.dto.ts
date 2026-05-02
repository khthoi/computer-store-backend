import { Product } from '../entities/product.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { ProductImage } from '../entities/product-image.entity';
import { Brand } from '../../brands/entities/brand.entity';

// ─── Status maps ────────────────────────────────────────────────────────────

const PRODUCT_STATUS_MAP: Record<string, 'published' | 'draft' | 'archived'> = {
  DangBan: 'published',
  Nhap: 'draft',
  NgungBan: 'archived',
};

const VARIANT_STATUS_MAP: Record<string, 'active' | 'inactive'> = {
  HienThi: 'active',
  An: 'inactive',
  HetHang: 'inactive',
};

export function mapProductStatus(trangThai: string): 'published' | 'draft' | 'archived' {
  return PRODUCT_STATUS_MAP[trangThai] ?? 'draft';
}

export function mapVariantStatus(trangThai: string): 'active' | 'inactive' {
  return VARIANT_STATUS_MAP[trangThai] ?? 'inactive';
}

export function mapFrontendStatusToDb(status: string): string | undefined {
  const map: Record<string, string> = {
    published: 'DangBan',
    draft: 'Nhap',
    archived: 'NgungBan',
  };
  return map[status];
}

// ─── Variant mapper ──────────────────────────────────────────────────────────

export interface VariantListResponse {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive';
  thumbnailUrl: string | null;
  updatedAt: string;
  isDefault: boolean;
}

export function mapVariantListResponse(v: ProductVariant): VariantListResponse {
  const mainImage = v.images?.find((img) => img.loaiAnh === 'AnhChinh') ?? v.images?.[0];
  return {
    id: String(v.id),
    sku: v.sku,
    name: v.tenPhienBan,
    price: Number(v.giaBan),
    stock: v.stockLevel?.soLuongTon ?? 0,
    status: mapVariantStatus(v.trangThai),
    thumbnailUrl: mainImage?.urlHinhAnh ?? null,
    updatedAt: v.ngayCapNhat?.toISOString() ?? new Date().toISOString(),
    isDefault: v.isMacDinh,
  };
}

// ─── Product list response ───────────────────────────────────────────────────

export interface ProductListResponse {
  id: string;
  name: string;
  slug: string;
  category: string;
  categoryId: string;
  brands: string[];
  brandIds: string[];
  totalStock: number;
  status: 'published' | 'draft' | 'archived';
  variants: VariantListResponse[];
  hasActiveOrders: boolean;
  defaultVariantId: string | null;
  createdAt: string;
  updatedAt: string;
  averageRating: number | null;
  reviewCount: number;
}

// ─── Variant admin detail response ───────────────────────────────────────────

const DETAIL_STATUS_MAP: Record<string, 'visible' | 'hidden' | 'out_of_stock'> = {
  HienThi: 'visible',
  An: 'hidden',
  HetHang: 'out_of_stock',
};

const IMAGE_TYPE_MAP: Record<string, 'main' | 'gallery'> = {
  AnhChinh: 'main',
  AnhPhu: 'gallery',
};

export interface ImageMediaResponse {
  id: string;
  variantId: string;
  url: string;
  assetId: string | null;
  type: 'main' | 'gallery';
  order: number;
  altText?: string;
}

export interface VariantAdminDetail {
  id: string;
  productId: string;
  name: string;
  sku: string;
  isDefault: boolean;
  originalPrice: number;
  salePrice: number;
  weight: number | undefined;
  status: 'visible' | 'hidden' | 'out_of_stock';
  updatedAt: string;
  description: string;
  specificationGroups: unknown[];
  media: ImageMediaResponse[];
}

export function mapImageToMedia(img: ProductImage): ImageMediaResponse {
  return {
    id: String(img.id),
    variantId: String(img.phienBanId),
    url: img.urlHinhAnh,
    assetId: img.assetId != null ? String(img.assetId) : null,
    type: IMAGE_TYPE_MAP[img.loaiAnh] ?? 'gallery',
    order: img.thuTu,
    ...(img.altText && { altText: img.altText }),
  };
}

export function mapVariantAdminDetail(variant: ProductVariant, specGroups: unknown[]): VariantAdminDetail {
  const images = (variant.images ?? [])
    .sort((a, b) => a.thuTu - b.thuTu)
    .map(mapImageToMedia);

  return {
    id: String(variant.id),
    productId: String(variant.sanPhamId),
    name: variant.tenPhienBan,
    sku: variant.sku,
    isDefault: variant.isMacDinh,
    originalPrice: Number(variant.giaGoc),
    salePrice: Number(variant.giaBan),
    weight: variant.trongLuong != null ? Number(variant.trongLuong) : undefined,
    status: DETAIL_STATUS_MAP[variant.trangThai] ?? 'hidden',
    updatedAt: variant.ngayCapNhat?.toISOString() ?? new Date().toISOString(),
    description: variant.moTaChiTiet ?? '',
    specificationGroups: specGroups,
    media: images,
  };
}

export function mapProductListResponse(product: Product, brands: Brand[]): ProductListResponse {
  const variants = (product.variants ?? []).map(mapVariantListResponse);
  const defaultVariant = variants.find((v) => v.isDefault) ?? null;
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);

  return {
    id: String(product.id),
    name: product.tenSanPham,
    slug: product.slug,
    category: product.danhMuc?.tenDanhMuc ?? '',
    categoryId: String(product.danhMuc?.id ?? ''),
    brands: brands.map((b) => b.tenThuongHieu),
    brandIds: brands.map((b) => String(b.id)),
    totalStock,
    status: mapProductStatus(product.trangThai),
    variants,
    hasActiveOrders: false,
    defaultVariantId: defaultVariant?.id ?? null,
    createdAt: product.ngayTao?.toISOString() ?? new Date().toISOString(),
    updatedAt: product.ngayCapNhat?.toISOString() ?? new Date().toISOString(),
    averageRating: product.diemDanhGiaTb ? Number(product.diemDanhGiaTb) : null,
    reviewCount: product.soLuotDanhGia,
  };
}
