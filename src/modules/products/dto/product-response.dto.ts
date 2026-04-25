import { Product } from '../entities/product.entity';
import { ProductVariant } from '../entities/product-variant.entity';
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
    stock: v.soLuongTon ?? 0,
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
