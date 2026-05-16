import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { HomepageSection } from '../entities/homepage-section.entity';
import { HomepagePreviewService } from './homepage-preview.service';
import { FlashSalesService } from '../../flash-sales/flash-sales.service';
import { PromotionsService } from '../../promotions/promotions.service';
import {
  StorefrontFlashSaleResponseDto,
  StorefrontHomepageSectionDto,
  StorefrontProductCardDto,
  StorefrontPromotionProductsDto,
  StorefrontVariantOptionDto,
} from '../dto/storefront-product-card.dto';

type EnrichedRow = {
  phienBanId: string;
  sanPhamId: string;
  slug: string | null;
  tenSanPham: string;
  sku: string;
  giaBan: string;
  giaGoc: string;
  hinhAnh: string | null;
  brand: string | null;
  soLuongTon: string | null;
  diemDanhGiaTb: string | null;
  soLuotDanhGia: string | null;
  ngayTao: Date | null;
};

type SiblingVariantRow = {
  phienBanId: string;
  sanPhamId: string;
  sku: string;
  tenPhienBan: string;
  giaBan: string;
  giaGoc: string;
  isMacDinh: number;
  soLuongTon: string | null;
  thumbnailUrl: string | null;
};

const NEW_BADGE_DAYS = 14;

@Injectable()
export class StorefrontHomeService {
  private readonly logger = new Logger(StorefrontHomeService.name);

  constructor(
    @InjectRepository(HomepageSection)
    private readonly sectionRepo: Repository<HomepageSection>,
    private readonly dataSource: DataSource,
    private readonly previewService: HomepagePreviewService,
    private readonly flashSalesService: FlashSalesService,
    private readonly promotionsService: PromotionsService,
  ) {}

  // ─── Homepage sections ─────────────────────────────────────────────────────

  async getHomepageSections(): Promise<StorefrontHomepageSectionDto[]> {
    const now = new Date();
    const sections = await this.sectionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.items', 'i')
      .where('s.is_visible = :visible', { visible: true })
      .andWhere('(s.ngay_bat_dau IS NULL OR s.ngay_bat_dau <= :now)', { now })
      .andWhere('(s.ngay_ket_thuc IS NULL OR s.ngay_ket_thuc >= :now)', { now })
      .orderBy('s.sort_order', 'ASC')
      .addOrderBy('i.sort_order', 'ASC')
      .getMany();

    this.logger.log(`Storefront: matched ${sections.length} visible homepage section(s)`);

    const result: StorefrontHomepageSectionDto[] = [];
    for (const section of sections) {
      let products: StorefrontProductCardDto[] = [];
      try {
        const variantIds = await this.resolveSectionVariantIds(section);
        const enriched = await this.enrichVariants(variantIds);
        products = variantIds
          .map((id) => enriched.get(id))
          .filter((p): p is StorefrontProductCardDto => Boolean(p));
        this.logger.log(
          `Storefront: section #${section.id} "${section.title}" (type=${section.type}) → ${products.length} product(s)`,
        );
      } catch (err) {
        this.logger.error(
          `Storefront: section #${section.id} "${section.title}" failed to resolve products`,
          err instanceof Error ? err.stack : String(err),
        );
      }

      result.push({
        sectionId: section.id,
        title: section.title,
        subtitle: section.subtitle ?? undefined,
        viewAllUrl: section.viewAllUrl ?? undefined,
        type: section.type as StorefrontHomepageSectionDto['type'],
        layout: section.layout as StorefrontHomepageSectionDto['layout'],
        badgeLabel: section.badgeLabel ?? undefined,
        badgeColor: section.badgeColor ?? undefined,
        badgeTextColor: section.badgeTextColor ?? undefined,
        sortOrder: section.sortOrder,
        products,
      });
    }
    return result;
  }

  private async resolveSectionVariantIds(section: HomepageSection): Promise<number[]> {
    if (section.type === 'manual') {
      return (section.items ?? [])
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => item.variantId);
    }
    const preview = await this.previewService.getPreview(
      section.type,
      section.sourceConfig,
      section.maxProducts,
    );
    return preview.map((p) => p.phienBanId);
  }

  // ─── Flash sale ────────────────────────────────────────────────────────────

  async getActiveFlashSale(): Promise<StorefrontFlashSaleResponseDto> {
    const flashSale = await this.flashSalesService.findActive();
    if (!flashSale) return { flashSale: null, products: [] };

    const variantIds = flashSale.items.map((i) => i.phienBanId);
    const enriched = await this.enrichVariants(variantIds);
    const products = flashSale.items
      .sort((a, b) => a.thuTuHienThi - b.thuTuHienThi)
      .map((item): StorefrontProductCardDto | null => {
        const base = enriched.get(item.phienBanId);
        if (!base) return null;
        const remaining = Math.max(0, item.soLuongGioiHan - item.soLuongDaBan);
        const flashPrice = Number(item.giaFlash);
        const originalPrice = Number(item.giaGocSnapshot);
        const flashVariantId = String(item.phienBanId);
        const patchedVariants = base.variants.map((v) =>
          v.id === flashVariantId
            ? { ...v, price: flashPrice, originalPrice }
            : v,
        );
        return {
          ...base,
          variants: patchedVariants,
          price: flashPrice,
          originalPrice: originalPrice > flashPrice ? originalPrice : undefined,
          stockStatus: remaining === 0 ? 'out-of-stock' : remaining <= 10 ? 'low-stock' : 'in-stock',
          stockQuantity: remaining,
          badge: 'Sale',
        };
      })
      .filter((p): p is StorefrontProductCardDto => Boolean(p));

    return {
      flashSale: {
        id: flashSale.flashSaleId,
        name: flashSale.ten,
        startAt: flashSale.batDau,
        endAt: flashSale.ketThuc,
        bannerTitle: flashSale.bannerTitle ?? null,
        bannerImageUrl: flashSale.bannerImageUrl ?? null,
        bannerAlt: flashSale.bannerAlt ?? null,
      },
      products,
    };
  }

  // ─── Promotion-scoped products ────────────────────────────────────────────

  async getActivePromotionProducts(maxProducts = 12): Promise<StorefrontPromotionProductsDto> {
    const allActive = await this.promotionsService.findActivePromotions();
    const scoped = allActive
      .filter((p) => p.type !== 'free_shipping')
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    const seenVariantIds = new Set<number>();
    const collected: Array<{ variantId: number; promotionId: number; promotionName: string }> = [];

    for (const promotion of scoped) {
      if (collected.length >= maxProducts) break;
      const preview = await this.previewService.getPreview(
        'promotion',
        { khuyenMaiId: promotion.id },
        maxProducts,
      );
      for (const item of preview) {
        if (collected.length >= maxProducts) break;
        if (seenVariantIds.has(item.phienBanId)) continue;
        seenVariantIds.add(item.phienBanId);
        collected.push({
          variantId: item.phienBanId,
          promotionId: promotion.id,
          promotionName: promotion.name,
        });
      }
    }

    const enriched = await this.enrichVariants(collected.map((c) => c.variantId));
    const products = collected
      .map((c) => {
        const base = enriched.get(c.variantId);
        if (!base) return null;
        return { ...base, promotionId: c.promotionId };
      })
      .filter((p): p is StorefrontProductCardDto & { promotionId: number } => Boolean(p));

    return {
      promotions: scoped.map((p) => ({
        id: p.id,
        name: p.name,
        endDate: typeof p.endDate === 'string' ? p.endDate : new Date(p.endDate).toISOString(),
      })),
      products,
    };
  }

  // ─── Shared enrichment query ──────────────────────────────────────────────

  private async enrichVariants(variantIds: number[]): Promise<Map<number, StorefrontProductCardDto>> {
    const result = new Map<number, StorefrontProductCardDto>();
    if (!variantIds.length) return result;

    const rows = await this.dataSource
      .createQueryBuilder()
      .select('v.phien_ban_id', 'phienBanId')
      .addSelect('sp.san_pham_id', 'sanPhamId')
      .addSelect('sp.slug', 'slug')
      .addSelect('sp.ten_san_pham', 'tenSanPham')
      .addSelect('v.sku', 'sku')
      .addSelect('v.gia_ban', 'giaBan')
      .addSelect('v.gia_goc', 'giaGoc')
      .addSelect('sp.diem_danh_gia_tb', 'diemDanhGiaTb')
      .addSelect('sp.so_luot_danh_gia', 'soLuotDanhGia')
      .addSelect('sp.ngay_tao', 'ngayTao')
      .addSelect(
        `(SELECT url_hinh_anh FROM hinh_anh_san_pham
            WHERE phien_ban_id = v.phien_ban_id
            ORDER BY (loai_anh = 'AnhChinh') DESC, thu_tu ASC, hinh_anh_id ASC LIMIT 1)`,
        'hinhAnh',
      )
      .addSelect(
        `(SELECT th.ten_thuong_hieu FROM san_pham_thuong_hieu spth
            JOIN thuong_hieu th ON th.thuong_hieu_id = spth.thuong_hieu_id
            WHERE spth.san_pham_id = sp.san_pham_id LIMIT 1)`,
        'brand',
      )
      .addSelect(
        `(SELECT so_luong_ton FROM ton_kho WHERE phien_ban_id = v.phien_ban_id LIMIT 1)`,
        'soLuongTon',
      )
      .from('phien_ban_san_pham', 'v')
      .innerJoin('san_pham', 'sp', 'sp.san_pham_id = v.san_pham_id')
      .where('v.phien_ban_id IN (:...ids)', { ids: variantIds })
      .getRawMany<EnrichedRow>();

    const productIds = Array.from(new Set(rows.map((r) => r.sanPhamId)));
    const variantsByProduct = await this.loadVariantsForProducts(productIds);

    for (const row of rows) {
      const siblings = variantsByProduct.get(row.sanPhamId) ?? [];
      const dto = this.toCardDto(row, siblings);
      result.set(dto.variantId, dto);
    }
    return result;
  }

  private async loadVariantsForProducts(
    productIds: string[],
  ): Promise<Map<string, StorefrontVariantOptionDto[]>> {
    const grouped = new Map<string, StorefrontVariantOptionDto[]>();
    if (!productIds.length) return grouped;

    const rows = await this.dataSource
      .createQueryBuilder()
      .select('v.phien_ban_id', 'phienBanId')
      .addSelect('v.san_pham_id', 'sanPhamId')
      .addSelect('v.sku', 'sku')
      .addSelect('v.ten_phien_ban', 'tenPhienBan')
      .addSelect('v.gia_ban', 'giaBan')
      .addSelect('v.gia_goc', 'giaGoc')
      .addSelect('v.is_mac_dinh', 'isMacDinh')
      .addSelect(
        `(SELECT so_luong_ton FROM ton_kho WHERE phien_ban_id = v.phien_ban_id LIMIT 1)`,
        'soLuongTon',
      )
      .addSelect(
        `(SELECT url_hinh_anh FROM hinh_anh_san_pham
            WHERE phien_ban_id = v.phien_ban_id
            ORDER BY (loai_anh = 'AnhChinh') DESC, thu_tu ASC, hinh_anh_id ASC LIMIT 1)`,
        'thumbnailUrl',
      )
      .from('phien_ban_san_pham', 'v')
      .where('v.san_pham_id IN (:...ids)', { ids: productIds })
      .andWhere(`v.trang_thai = 'HienThi'`)
      .orderBy('v.is_mac_dinh', 'DESC')
      .addOrderBy('v.phien_ban_id', 'ASC')
      .getRawMany<SiblingVariantRow>();

    for (const r of rows) {
      const option: StorefrontVariantOptionDto = {
        id: String(r.phienBanId),
        name: r.tenPhienBan,
        sku: r.sku,
        price: Number(r.giaBan),
        originalPrice: Number(r.giaGoc),
        stock: r.soLuongTon != null ? Number(r.soLuongTon) : 0,
        isDefault: Number(r.isMacDinh) === 1,
        thumbnailUrl: r.thumbnailUrl ?? null,
      };
      const list = grouped.get(r.sanPhamId) ?? [];
      list.push(option);
      grouped.set(r.sanPhamId, list);
    }
    return grouped;
  }

  private toCardDto(row: EnrichedRow, variants: StorefrontVariantOptionDto[]): StorefrontProductCardDto {
    const price = Number(row.giaBan);
    const originalPrice = Number(row.giaGoc);
    const stockQty = row.soLuongTon != null ? Number(row.soLuongTon) : 0;
    const stockStatus: StorefrontProductCardDto['stockStatus'] =
      stockQty === 0 ? 'out-of-stock' : stockQty <= 10 ? 'low-stock' : 'in-stock';
    const ngayTao = row.ngayTao ? new Date(row.ngayTao) : null;
    const ageMs = ngayTao ? Date.now() - ngayTao.getTime() : Infinity;
    const isNew = ageMs < NEW_BADGE_DAYS * 86_400_000;
    const badge = originalPrice > price ? 'Sale' : isNew ? 'New' : undefined;

    return {
      id: String(row.sanPhamId),
      slug: row.slug ?? null,
      variantId: Number(row.phienBanId),
      name: row.tenSanPham,
      brand: row.brand ?? '',
      thumbnail: row.hinhAnh ?? '',
      price,
      originalPrice: originalPrice > price ? originalPrice : undefined,
      productCode: row.sku,
      rating: row.diemDanhGiaTb != null ? Number(row.diemDanhGiaTb) : undefined,
      reviewCount: row.soLuotDanhGia != null ? Number(row.soLuotDanhGia) : undefined,
      stockStatus,
      stockQuantity: stockStatus === 'low-stock' || stockStatus === 'out-of-stock' ? stockQty : undefined,
      badge,
      variants,
    };
  }
}
