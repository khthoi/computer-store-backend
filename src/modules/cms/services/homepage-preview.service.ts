import { Injectable } from '@nestjs/common';
import { DataSource, In, SelectQueryBuilder } from 'typeorm';
import { PromotionScope, ScopeType } from '../../promotions/entities/promotion-scope.entity';
import { PromotionCondition, ConditionType } from '../../promotions/entities/promotion-condition.entity';

export interface PreviewProductDto {
  sanPhamId: number;
  phienBanId: number;
  tenSanPham: string;
  SKU: string;
  giaBan: number;
  giaGoc: number;
  hinhAnh?: string;
  thuongHieu?: string;
}

type RawPreviewRow = {
  sanPhamId: string;
  phienBanId: string;
  tenSanPham: string;
  SKU: string;
  giaBan: string;
  giaGoc: string;
  hinhAnh: string | null;
};

@Injectable()
export class HomepagePreviewService {
  constructor(private readonly dataSource: DataSource) {}

  async getPreview(type: string, config: unknown, maxProducts: number): Promise<PreviewProductDto[]> {
    if (type === 'manual') return [];

    const cfg = (config ?? {}) as Record<string, unknown>;

    const qb = this.dataSource
      .createQueryBuilder()
      .select('sp.san_pham_id', 'sanPhamId')
      .addSelect('v.phien_ban_id', 'phienBanId')
      .addSelect('sp.ten_san_pham', 'tenSanPham')
      .addSelect('v.sku', 'SKU')
      .addSelect('v.gia_ban', 'giaBan')
      .addSelect('v.gia_goc', 'giaGoc')
      .addSelect(
        '(SELECT url_hinh_anh FROM hinh_anh_san_pham WHERE phien_ban_id = v.phien_ban_id ORDER BY hinh_anh_id ASC LIMIT 1)',
        'hinhAnh',
      )
      .from('phien_ban_san_pham', 'v')
      .innerJoin('san_pham', 'sp', 'sp.san_pham_id = v.san_pham_id')
      .where('v.trang_thai = :vStatus', { vStatus: 'HienThi' })
      .andWhere('sp.trang_thai = :spStatus', { spStatus: 'DangBan' });

    let hasScope = true;
    let skipDefaultVariantFilter = false;

    switch (type) {
      case 'category':
        this.applyCategory(qb, cfg);
        break;
      case 'brand':
        this.applyBrand(qb, cfg);
        break;
      case 'promotion': {
        const result = await this.applyPromotion(qb, cfg);
        hasScope = result.hasScope;
        skipDefaultVariantFilter = result.hasVariantScope;
        break;
      }
      case 'new_arrivals':
        this.applyCategoryFilter(qb, cfg);
        qb.orderBy('sp.ngay_tao', 'DESC');
        break;
      case 'best_selling':
        this.applyCategoryFilter(qb, cfg);
        qb.orderBy(
          '(SELECT COALESCE(SUM(ct.so_luong), 0) FROM chi_tiet_don_hang ct WHERE ct.phien_ban_id = v.phien_ban_id)',
          'DESC',
        );
        break;
    }

    if (!hasScope) return [];

    // One row per product: prefer the default variant; fall back to the first
    // visible variant when no variant has been flagged as default.
    // (Hard `is_mac_dinh = true` filter would silently hide products that were
    // imported without explicitly setting a default variant.)
    if (!skipDefaultVariantFilter) {
      qb.andWhere(
        `v.phien_ban_id = (
          SELECT _v.phien_ban_id FROM phien_ban_san_pham _v
          WHERE _v.san_pham_id = sp.san_pham_id
            AND _v.trang_thai = 'HienThi'
          ORDER BY _v.is_mac_dinh DESC, _v.phien_ban_id ASC
          LIMIT 1
        )`,
      );
    }

    const rows = await qb.limit(maxProducts).getRawMany<RawPreviewRow>();
    return rows.map((r) => ({
      sanPhamId: Number(r.sanPhamId),
      phienBanId: Number(r.phienBanId),
      tenSanPham: r.tenSanPham,
      SKU: r.SKU,
      giaBan: Number(r.giaBan),
      giaGoc: Number(r.giaGoc),
      hinhAnh: r.hinhAnh ?? undefined,
    }));
  }

  private applyCategory(qb: SelectQueryBuilder<any>, cfg: Record<string, unknown>): void {
    const ids = (cfg.danhMucIds as number[] | undefined) ?? [];
    if (ids.length) {
      // Include products from selected categories and their direct sub-categories
      qb.andWhere(
        `sp.danh_muc_id IN (
          SELECT danh_muc_id FROM danh_muc
          WHERE danh_muc_id IN (:...catIds) OR danh_muc_cha_id IN (:...catIds)
        )`,
        { catIds: ids },
      );
    }
    this.applySortBy(qb, (cfg.sortBy as string | undefined) ?? 'newest');
  }

  private applyCategoryFilter(qb: SelectQueryBuilder<any>, cfg: Record<string, unknown>): void {
    const ids = (cfg.danhMucIds as number[] | undefined) ?? [];
    if (ids.length) {
      qb.andWhere(
        `sp.danh_muc_id IN (
          SELECT danh_muc_id FROM danh_muc
          WHERE danh_muc_id IN (:...autoFilterCatIds) OR danh_muc_cha_id IN (:...autoFilterCatIds)
        )`,
        { autoFilterCatIds: ids },
      );
    }
  }

  private applyBrand(qb: SelectQueryBuilder<any>, cfg: Record<string, unknown>): void {
    const ids = (cfg.thuongHieuIds as number[] | undefined) ?? [];
    if (ids.length) {
      qb.innerJoin('san_pham_thuong_hieu', 'pb', 'pb.san_pham_id = sp.san_pham_id')
        .andWhere('pb.thuong_hieu_id IN (:...brandIds)', { brandIds: ids });
    }
    this.applySortBy(qb, (cfg.sortBy as string | undefined) ?? 'newest');
  }

  // Decision tree:
  // 1. Non-global scopes exist → resolve products from scope rows (union of all types)
  // 2. Global-only / no scopes → resolve from conditions (required_products, required_categories)
  // 3. Neither → hasScope=false (caller returns [])
  // hasVariantScope=true signals caller to skip the is_mac_dinh filter (variant scope already pins specific variants)
  private async applyPromotion(
    qb: SelectQueryBuilder<any>,
    cfg: Record<string, unknown>,
  ): Promise<{ hasScope: boolean; hasVariantScope: boolean }> {
    const khuyenMaiId = cfg.khuyenMaiId as number | undefined;
    if (!khuyenMaiId) return { hasScope: false, hasVariantScope: false };

    const scopes = await this.dataSource
      .getRepository(PromotionScope)
      .find({ where: { promotionId: khuyenMaiId } });

    const nonGlobalScopes = scopes.filter((s) => s.scopeType !== ScopeType.GLOBAL);

    if (nonGlobalScopes.length > 0) {
      this.applyNonGlobalScopes(qb, nonGlobalScopes);
      qb.orderBy('v.gia_ban', 'ASC');
      const hasVariantScope = nonGlobalScopes.some((s) => s.scopeType === ScopeType.VARIANT);
      return { hasScope: true, hasVariantScope };
    }

    // Global or no scope → inspect conditions for implicit product scope
    const conditions = await this.dataSource.getRepository(PromotionCondition).find({
      where: {
        promotionId: khuyenMaiId,
        type: In([ConditionType.REQUIRED_PRODUCTS, ConditionType.REQUIRED_CATEGORIES]),
      },
    });

    if (!conditions.length) return { hasScope: false, hasVariantScope: false };

    const hasScope = this.applyConditionScope(qb, conditions);
    return { hasScope, hasVariantScope: false };
  }

  private applyNonGlobalScopes(qb: SelectQueryBuilder<any>, scopes: PromotionScope[]): void {
    const productIds = scopes
      .filter((s) => s.scopeType === ScopeType.PRODUCT && s.scopeRefId)
      .map((s) => Number(s.scopeRefId));

    const variantIds = scopes
      .filter((s) => s.scopeType === ScopeType.VARIANT && s.scopeRefId)
      .map((s) => Number(s.scopeRefId));

    const categoryIds = scopes
      .filter((s) => s.scopeType === ScopeType.CATEGORY && s.scopeRefId)
      .map((s) => Number(s.scopeRefId));

    const brandIds = scopes
      .filter((s) => s.scopeType === ScopeType.BRAND && s.scopeRefId)
      .map((s) => Number(s.scopeRefId));

    const orParts: string[] = [];
    const params: Record<string, number[]> = {};

    if (productIds.length) {
      params.scopeProductIds = productIds;
      orParts.push('sp.san_pham_id IN (:...scopeProductIds)');
    }
    if (variantIds.length) {
      params.scopeVariantIds = variantIds;
      orParts.push('v.phien_ban_id IN (:...scopeVariantIds)');
    }
    if (categoryIds.length) {
      params.scopeCategoryIds = categoryIds;
      orParts.push(
        `sp.danh_muc_id IN (
          SELECT danh_muc_id FROM danh_muc
          WHERE danh_muc_id IN (:...scopeCategoryIds) OR danh_muc_cha_id IN (:...scopeCategoryIds)
        )`,
      );
    }
    if (brandIds.length) {
      params.scopeBrandIds = brandIds;
      orParts.push(
        `sp.san_pham_id IN (
          SELECT san_pham_id FROM san_pham_thuong_hieu
          WHERE thuong_hieu_id IN (:...scopeBrandIds)
        )`,
      );
    }

    if (orParts.length) {
      qb.andWhere(`(${orParts.join(' OR ')})`, params);
    }
  }

  // required_products condition value is a JSON array of IDs — treated as variant IDs first,
  // then product IDs as fallback, so both product-level and variant-level selections work.
  // required_categories condition value is a JSON array of category IDs (includes sub-categories).
  private applyConditionScope(qb: SelectQueryBuilder<any>, conditions: PromotionCondition[]): boolean {
    const productCond = conditions.find((c) => c.type === ConditionType.REQUIRED_PRODUCTS);
    const categoryCond = conditions.find((c) => c.type === ConditionType.REQUIRED_CATEGORIES);

    const orParts: string[] = [];
    const params: Record<string, number[]> = {};

    if (productCond) {
      const ids = (JSON.parse(productCond.value) as (string | number)[]).map(Number).filter(Boolean);
      if (ids.length) {
        params.condProdIds = ids;
        orParts.push('(v.phien_ban_id IN (:...condProdIds) OR sp.san_pham_id IN (:...condProdIds))');
      }
    }

    if (categoryCond) {
      const catIds = (JSON.parse(categoryCond.value) as (string | number)[]).map(Number).filter(Boolean);
      if (catIds.length) {
        params.condCategoryIds = catIds;
        orParts.push(
          `sp.danh_muc_id IN (
            SELECT danh_muc_id FROM danh_muc
            WHERE danh_muc_id IN (:...condCategoryIds) OR danh_muc_cha_id IN (:...condCategoryIds)
          )`,
        );
      }
    }

    if (!orParts.length) return false;

    qb.andWhere(`(${orParts.join(' OR ')})`, params);
    qb.orderBy('v.gia_ban', 'ASC');
    return true;
  }

  private applySortBy(qb: SelectQueryBuilder<any>, sortBy: string): void {
    if (sortBy === 'best_selling') {
      qb.orderBy(
        '(SELECT COALESCE(SUM(ct.so_luong), 0) FROM chi_tiet_don_hang ct JOIN phien_ban_san_pham _pv ON ct.phien_ban_id = _pv.phien_ban_id WHERE _pv.san_pham_id = sp.san_pham_id)',
        'DESC',
      );
      return;
    }
    const sorts: Record<string, [string, 'ASC' | 'DESC']> = {
      newest: ['sp.ngay_tao', 'DESC'],
      price_asc: ['v.gia_ban', 'ASC'],
      price_desc: ['v.gia_ban', 'DESC'],
      highest_rated: ['sp.diem_danh_gia_tb', 'DESC'],
    };
    const [col, dir] = sorts[sortBy] ?? ['sp.ngay_tao', 'DESC'];
    qb.orderBy(col, dir);
  }
}
