import type { Category } from '../entities/category.entity';

export class CategoryResponseDto {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string;
  displayOrder: number;
  active: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
  nodeType: string;
  filterParams: Record<string, unknown> | null;
  badgeText: string | null;
  badgeBg: string | null;
  badgeFg: string | null;
  imageUrl: string | null;
  imageAssetId: string | null;
  imageAlt: string | null;

  static from(cat: Category, productCount = 0): CategoryResponseDto {
    return {
      id: String(cat.id),
      name: cat.tenDanhMuc,
      slug: cat.slug,
      parentId: cat.danhMucChaId != null ? String(cat.danhMucChaId) : null,
      description: cat.moTa ?? '',
      displayOrder: cat.thuTuHienThi,
      active: cat.trangThai === 'Hien',
      productCount,
      createdAt: '',
      updatedAt: '',
      nodeType: cat.nodeType,
      filterParams: cat.filterParams ?? null,
      badgeText: cat.badgeText ?? null,
      badgeBg: cat.badgeBg ?? null,
      badgeFg: cat.badgeFg ?? null,
      imageUrl: cat.hinhAnh ?? null,
      imageAssetId: cat.assetId != null ? String(cat.assetId) : null,
      imageAlt: cat.imageAlt ?? null,
    };
  }

  static fromTree(
    cat: Category,
    countMap: Map<number, number> = new Map(),
  ): CategoryResponseDto & { children?: CategoryResponseDto[] } {
    const children = cat.children?.length
      ? cat.children.map((c) => CategoryResponseDto.fromTree(c, countMap))
      : undefined;

    const directCount = countMap.get(cat.id) ?? 0;
    const childrenCount = children?.reduce((sum, c) => sum + c.productCount, 0) ?? 0;

    return {
      ...CategoryResponseDto.from(cat, directCount + childrenCount),
      children,
    };
  }
}
