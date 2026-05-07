import { HomepageSection } from '../entities/homepage-section.entity';
import { HomepageSectionItem } from '../entities/homepage-section-item.entity';

export interface SectionItemResponseDto {
  id: number;
  sectionId: number;
  sanPhamId: number;
  phienBanId: number;
  sortOrder: number;
  tenSanPham: string;
  SKU: string;
  giaBan: number;
  giaGoc: number;
  hinhAnh?: string;
}

export interface HomepageSectionResponseDto {
  sectionId: number;
  title: string;
  subtitle?: string;
  viewAllUrl?: string;
  type: string;
  sourceConfig: Record<string, unknown> | null;
  sortBy: string | null;
  maxProducts: number;
  layout: string;
  badgeLabel?: string;
  badgeColor?: string;
  badgeTextColor?: string;
  isVisible: boolean;
  sortOrder: number;
  ngayBatDau?: string;
  ngayKetThuc?: string;
  productCount?: number;
  items?: SectionItemResponseDto[];
  ngayTao: string;
  ngayCapNhat: string;
}

function mapItem(item: HomepageSectionItem): SectionItemResponseDto {
  const variant = item.variant as any;
  return {
    id: item.id,
    sectionId: item.sectionId,
    sanPhamId: Number(variant?.sanPhamId ?? 0),
    phienBanId: item.variantId,
    sortOrder: item.sortOrder,
    tenSanPham: variant?.product?.tenSanPham ?? '',
    SKU: variant?.sku ?? '',
    giaBan: Number(variant?.giaBan ?? 0),
    giaGoc: Number(variant?.giaGoc ?? 0),
    hinhAnh: variant?.images?.[0]?.urlHinhAnh ?? undefined,
  };
}

export function toHomepageSectionResponse(section: HomepageSection): HomepageSectionResponseDto {
  const mappedItems = section.items?.map(mapItem) ?? [];
  return {
    sectionId: section.id,
    title: section.title,
    subtitle: section.subtitle ?? undefined,
    viewAllUrl: section.viewAllUrl ?? undefined,
    type: section.type,
    sourceConfig: section.sourceConfig,
    sortBy: section.sortBy,
    maxProducts: section.maxProducts,
    layout: section.layout,
    badgeLabel: section.badgeLabel ?? undefined,
    badgeColor: section.badgeColor ?? undefined,
    badgeTextColor: section.badgeTextColor ?? undefined,
    isVisible: section.isVisible,
    sortOrder: section.sortOrder,
    ngayBatDau: section.startAt?.toISOString(),
    ngayKetThuc: section.endAt?.toISOString(),
    productCount: mappedItems.length || undefined,
    items: section.type === 'manual' ? mappedItems : undefined,
    ngayTao: section.createdAt.toISOString(),
    ngayCapNhat: section.updatedAt.toISOString(),
  };
}
