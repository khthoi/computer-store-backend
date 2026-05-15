import { Product } from '../entities/product.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { ProductImage } from '../entities/product-image.entity';
import { Brand } from '../../brands/entities/brand.entity';

// ─── Public-facing product detail response (storefront) ─────────────────────

export interface PublicVariantImageResponse {
  id: string;
  url: string;
  alt: string | null;
  type: 'main' | 'gallery';
  order: number;
}

export interface PublicVariantDetailResponse {
  id: string;
  sku: string;
  name: string;
  description: string;
  originalPrice: number;
  salePrice: number;
  stock: number;
  weight: number | null;
  warrantyPolicy: string | null;
  warrantyMonths: number | null;
  status: 'visible' | 'hidden' | 'out_of_stock';
  isDefault: boolean;
  images: PublicVariantImageResponse[];
}

export interface PublicProductDetailResponse {
  id: string;
  name: string;
  slug: string;
  code: string;
  sku: string;
  shortDescription: string | null;
  descriptionHtml: string;
  warrantyPolicy: string | null;
  averageRating: number;
  reviewCount: number;
  status: 'published' | 'draft' | 'archived';
  defaultVariantId: string;
  category: { id: string; name: string; slug: string } | null;
  brand: { id: string; name: string; slug: string | null; logo: string | null } | null;
  brands: { id: string; name: string; slug: string | null; logo: string | null }[];
  variants: PublicVariantDetailResponse[];
  createdAt: string;
  updatedAt: string;
}

// ─── Status maps ────────────────────────────────────────────────────────────

const PRODUCT_STATUS_MAP: Record<string, 'published' | 'draft' | 'archived'> = {
  DangBan: 'published',
  Nhap: 'draft',
  NgungBan: 'archived',
};

const VARIANT_DETAIL_STATUS_MAP: Record<string, 'visible' | 'hidden' | 'out_of_stock'> = {
  HienThi: 'visible',
  An: 'hidden',
  HetHang: 'out_of_stock',
};

const IMAGE_TYPE_MAP: Record<string, 'main' | 'gallery'> = {
  AnhChinh: 'main',
  AnhPhu: 'gallery',
};

// ─── Mappers ────────────────────────────────────────────────────────────────

function mapImage(img: ProductImage): PublicVariantImageResponse {
  return {
    id: String(img.id),
    url: img.urlHinhAnh,
    alt: img.altText ?? null,
    type: IMAGE_TYPE_MAP[img.loaiAnh] ?? 'gallery',
    order: img.thuTu,
  };
}

function sortImages(images: ProductImage[]): ProductImage[] {
  // Main image first, then by thuTu ascending
  return [...images].sort((a, b) => {
    const aIsMain = a.loaiAnh === 'AnhChinh' ? 0 : 1;
    const bIsMain = b.loaiAnh === 'AnhChinh' ? 0 : 1;
    if (aIsMain !== bIsMain) return aIsMain - bIsMain;
    return (a.thuTu ?? 0) - (b.thuTu ?? 0);
  });
}

function mapVariant(v: ProductVariant): PublicVariantDetailResponse {
  const images = sortImages(v.images ?? []).map(mapImage);
  return {
    id: String(v.id),
    sku: v.sku,
    name: v.tenPhienBan,
    description: v.moTaChiTiet ?? '',
    originalPrice: Number(v.giaGoc),
    salePrice: Number(v.giaBan),
    stock: v.stockLevel?.soLuongTon ?? 0,
    weight: v.trongLuong != null ? Number(v.trongLuong) : null,
    warrantyPolicy: v.chinhSachBaoHanh ?? null,
    warrantyMonths: v.thoiGianBaoHanh ?? null,
    status: VARIANT_DETAIL_STATUS_MAP[v.trangThai] ?? 'hidden',
    isDefault: !!v.isMacDinh,
    images,
  };
}

export function mapPublicProductDetail(
  product: Product,
  brands: Brand[],
): PublicProductDetailResponse {
  const variants = (product.variants ?? []).map(mapVariant);
  const defaultVariant = variants.find((v) => v.isDefault) ?? variants[0] ?? null;
  const primaryBrand = brands.length > 0 ? brands[0] : null;
  const brandList = brands.map((b) => ({
    id: String(b.id),
    name: b.tenThuongHieu,
    slug: b.slug,
    logo: b.logo,
  }));

  return {
    id: String(product.id),
    name: product.tenSanPham,
    slug: product.slug,
    code: product.maSanPham,
    sku: defaultVariant?.sku ?? '',
    shortDescription: product.moTaNgan ?? null,
    descriptionHtml: product.moTaChiTiet ?? '',
    warrantyPolicy: product.chinhSachBaoHanh ?? null,
    averageRating: product.diemDanhGiaTb != null ? Number(product.diemDanhGiaTb) : 0,
    reviewCount: product.soLuotDanhGia ?? 0,
    status: PRODUCT_STATUS_MAP[product.trangThai] ?? 'draft',
    defaultVariantId: defaultVariant?.id ?? '',
    category: product.danhMuc
      ? {
          id: String(product.danhMuc.id),
          name: product.danhMuc.tenDanhMuc,
          slug: product.danhMuc.slug,
        }
      : null,
    brand: primaryBrand
      ? {
          id: String(primaryBrand.id),
          name: primaryBrand.tenThuongHieu,
          slug: primaryBrand.slug,
          logo: primaryBrand.logo,
        }
      : null,
    brands: brandList,
    variants,
    createdAt: product.ngayTao?.toISOString() ?? new Date().toISOString(),
    updatedAt: product.ngayCapNhat?.toISOString() ?? new Date().toISOString(),
  };
}
