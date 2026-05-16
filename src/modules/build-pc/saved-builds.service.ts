import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedBuild } from './entities/saved-build.entity';
import { BuildDetail } from './entities/build-detail.entity';
import { ProductBrand } from '../brands/entities/product-brand.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { FlashSaleItem } from '../flash-sales/entities/flash-sale-item.entity';
import { CreateSavedBuildDto } from './dto/create-saved-build.dto';
import { UpdateSavedBuildDto } from './dto/update-saved-build.dto';
import {
  MySavedBuildSummaryDto,
  MySavedBuildDetailDto,
  type ApplicableCoupon,
  type AppliedFlashSale,
  type AppliedPromotion,
  type BuildEnrichment,
} from './dto/my-saved-build-response.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const MAX_BUILDS_PER_CUSTOMER = 5;

@Injectable()
export class SavedBuildsService {
  constructor(
    @InjectRepository(SavedBuild) private readonly buildRepo: Repository<SavedBuild>,
    @InjectRepository(BuildDetail) private readonly detailRepo: Repository<BuildDetail>,
    @InjectRepository(ProductBrand) private readonly productBrandRepo: Repository<ProductBrand>,
    @InjectRepository(Promotion) private readonly promotionRepo: Repository<Promotion>,
    @InjectRepository(FlashSaleItem) private readonly flashSaleItemRepo: Repository<FlashSaleItem>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ── Flash-sale lookup ──────────────────────────────────────────────────────
  /** Returns flash-sale info for any of `variantIds` that's currently active. */
  private async findActiveFlashSales(variantIds: number[]): Promise<Map<number, AppliedFlashSale>> {
    if (variantIds.length === 0) return new Map();
    const now = new Date();
    const items = await this.flashSaleItemRepo
      .createQueryBuilder('fsi')
      .leftJoinAndSelect('fsi.flashSale', 'fs')
      .where('fsi.phienBanId IN (:...ids)', { ids: variantIds })
      .andWhere("fs.trangThai = 'active'")
      .andWhere('fs.batDau <= :now', { now })
      .andWhere('fs.ketThuc >= :now', { now })
      .andWhere('fsi.soLuongDaBan < fsi.soLuongGioiHan')
      .getMany();

    // If a variant appears in multiple active sales, keep the cheapest flash price.
    const result = new Map<number, AppliedFlashSale>();
    for (const it of items) {
      const candidate: AppliedFlashSale = {
        flashSaleId: it.flashSaleId,
        ten: it.flashSale?.ten ?? '',
        giaFlash: Number(it.giaFlash),
        ketThuc: it.flashSale?.ketThuc?.toISOString() ?? '',
      };
      const existing = result.get(it.phienBanId);
      if (!existing || candidate.giaFlash < existing.giaFlash) {
        result.set(it.phienBanId, candidate);
      }
    }
    return result;
  }

  // ── Auto-applied (non-coupon) promotions matching scope ───────────────────
  /**
   * For each variant, returns active auto-apply promotions (is_coupon = false)
   * whose scope intersects that variant. Scope match works on variant / product
   * / category / brand IDs we already have for the build.
   */
  private async findAutoPromotionsByVariant(
    items: Array<{
      phienBanId: number;
      sanPhamId: number;
      danhMucId: number | null;
      brandIds: number[];
    }>,
  ): Promise<Map<number, AppliedPromotion[]>> {
    const out = new Map<number, AppliedPromotion[]>();
    if (items.length === 0) return out;

    const now = new Date();
    const promos = await this.promotionRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.actions', 'act')
      .leftJoinAndSelect('p.scopes', 'sc')
      .where('p.isCoupon = 0')
      .andWhere("p.status = 'active'")
      .andWhere('p.startDate <= :now', { now })
      .andWhere('p.endDate >= :now', { now })
      .getMany();

    for (const it of items) {
      const matched: AppliedPromotion[] = [];
      for (const p of promos) {
        const hit = (p.scopes ?? []).some((sc) => {
          if (sc.scopeType === 'global') return true;
          if (sc.scopeRefId == null) return false;
          const ref = sc.scopeRefId;
          if (sc.scopeType === 'variant') return ref === String(it.phienBanId);
          if (sc.scopeType === 'product') return ref === String(it.sanPhamId);
          if (sc.scopeType === 'category' && it.danhMucId != null) return ref === String(it.danhMucId);
          if (sc.scopeType === 'brand') return it.brandIds.some((bid) => ref === String(bid));
          return false;
        });
        if (!hit) continue;
        const action = p.actions?.[0];
        let discountLabel: string | null = null;
        if (action?.discountValue != null) {
          const raw = Number(action.discountValue);
          if (action.discountType === 'percentage') discountLabel = `Giảm ${raw}%`;
          else if (action.discountType === 'fixed') discountLabel = `Giảm ${raw.toLocaleString('vi-VN')} ₫`;
        }
        matched.push({
          id: p.id,
          name: p.name,
          code: p.code,
          discountLabel,
          discountValue: action?.discountValue != null ? Number(action.discountValue) : null,
          discountType: (action?.discountType === 'percentage' || action?.discountType === 'fixed')
            ? action.discountType
            : null,
        });
      }
      if (matched.length > 0) out.set(it.phienBanId, matched);
    }
    return out;
  }

  // ── Coupon matching ────────────────────────────────────────────────────────
  /**
   * Returns active coupon-type promotions whose scope intersects the build's items.
   * Match rule: scopeType='global', OR scope_ref_id ∈ corresponding ID set
   * (variant / product / category / brand).
   */
  private async findApplicableCoupons(
    variantIds: number[],
    productIds: number[],
    categoryIds: number[],
    brandIds: number[],
  ): Promise<ApplicableCoupon[]> {
    const now = new Date();
    const qb = this.promotionRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.actions', 'act')
      .leftJoin('p.scopes', 'sc')
      .where('p.isCoupon = 1')
      .andWhere("p.status = 'active'")
      .andWhere('p.startDate <= :now', { now })
      .andWhere('p.endDate >= :now', { now })
      .andWhere('p.code IS NOT NULL');

    // Scope match (any one): build OR'd conditions only with non-empty arrays
    const orClauses: string[] = ["sc.scopeType = 'global'"];
    const params: Record<string, unknown> = {};
    if (variantIds.length) {
      orClauses.push("(sc.scopeType = 'variant' AND sc.scopeRefId IN (:...vids))");
      params.vids = variantIds.map(String);
    }
    if (productIds.length) {
      orClauses.push("(sc.scopeType = 'product' AND sc.scopeRefId IN (:...pids))");
      params.pids = productIds.map(String);
    }
    if (categoryIds.length) {
      orClauses.push("(sc.scopeType = 'category' AND sc.scopeRefId IN (:...cids))");
      params.cids = categoryIds.map(String);
    }
    if (brandIds.length) {
      orClauses.push("(sc.scopeType = 'brand' AND sc.scopeRefId IN (:...bids))");
      params.bids = brandIds.map(String);
    }
    qb.andWhere(`(${orClauses.join(' OR ')})`, params);

    const promotions = await qb.getMany();

    // De-duplicate by promotion id (a promotion may have multiple matching scopes)
    const seen = new Set<number>();
    const result: ApplicableCoupon[] = [];
    for (const p of promotions) {
      if (seen.has(p.id) || !p.code) continue;
      seen.add(p.id);
      const action = p.actions?.[0];
      let discountLabel = p.name;
      if (action?.discountValue != null) {
        const raw = Number(action.discountValue);
        if (action.discountType === 'percentage') {
          discountLabel = `Giảm ${raw}%`;
        } else if (action.discountType === 'fixed') {
          discountLabel = `Giảm ${raw.toLocaleString('vi-VN')} ₫`;
        }
      }
      result.push({
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description ?? null,
        discountLabel,
        endDate: p.endDate.toISOString(),
      });
    }
    return result;
  }

  // ── List ───────────────────────────────────────────────────────────────────
  async findMine(khachHangId: number): Promise<MySavedBuildSummaryDto[]> {
    const builds = await this.buildRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.details', 'd')
      .leftJoinAndSelect('d.slot', 'slot')
      .leftJoinAndSelect('d.phienBan', 'pv')
      .where('b.khachHangId = :id', { id: khachHangId })
      .orderBy('b.ngayCapNhat', 'DESC')
      .getMany();
    return builds.map(MySavedBuildSummaryDto.fromEntity);
  }

  // ── Detail (owner or public) ──────────────────────────────────────────────
  async findOne(id: number, khachHangId?: number): Promise<MySavedBuildDetailDto> {
    const build = await this.buildRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.details', 'd')
      .leftJoinAndSelect('d.slot', 'slot')
      .leftJoinAndSelect('d.phienBan', 'pv')
      .leftJoinAndSelect('pv.product', 'sp')
      .leftJoinAndSelect('sp.danhMuc', 'dm')
      .leftJoinAndSelect('pv.images', 'img', "img.loai_anh = 'AnhChinh'")
      .where('b.id = :id', { id })
      .getOne();
    if (!build) throw new NotFoundException('Build không tồn tại');
    if (!build.isPublic && build.khachHangId !== khachHangId) {
      throw new ForbiddenException('Không có quyền truy cập');
    }

    const productIds = Array.from(
      new Set(
        (build.details ?? [])
          .map((d) => (d.phienBan as unknown as { product?: { id?: number } } | undefined)?.product?.id)
          .filter((x): x is number => typeof x === 'number'),
      ),
    );

    const brandsByProduct = new Map<number, { id: number; ten: string }[]>();
    if (productIds.length) {
      const rows = await this.productBrandRepo
        .createQueryBuilder('pb')
        .leftJoinAndSelect('pb.brand', 'th')
        .where('pb.sanPhamId IN (:...ids)', { ids: productIds })
        .getMany();
      for (const r of rows) {
        const arr = brandsByProduct.get(r.sanPhamId) ?? [];
        const ten = (r as unknown as { brand?: { tenThuongHieu?: string } }).brand?.tenThuongHieu ?? '';
        arr.push({ id: r.thuongHieuId, ten });
        brandsByProduct.set(r.sanPhamId, arr);
      }
    }

    // Collect IDs for promotion/flash-sale scope matching
    const variantIds: number[] = [];
    const categoryIds = new Set<number>();
    const perItem: Array<{ phienBanId: number; sanPhamId: number; danhMucId: number | null; brandIds: number[] }> = [];
    for (const d of build.details ?? []) {
      variantIds.push(d.phienBanId);
      const variant = d.phienBan as unknown as { product?: { id?: number; danhMucId?: number } } | undefined;
      const pid = variant?.product?.id ?? 0;
      const cid = variant?.product?.danhMucId ?? null;
      if (typeof cid === 'number') categoryIds.add(cid);
      perItem.push({
        phienBanId: d.phienBanId,
        sanPhamId: pid,
        danhMucId: typeof cid === 'number' ? cid : null,
        brandIds: (brandsByProduct.get(pid) ?? []).map((b) => b.id),
      });
    }
    const brandIds = new Set<number>();
    for (const arr of brandsByProduct.values()) {
      for (const b of arr) brandIds.add(b.id);
    }

    const [applicableCoupons, flashSaleByVariant, promotionsByVariant] = await Promise.all([
      this.findApplicableCoupons(
        variantIds,
        productIds,
        Array.from(categoryIds),
        Array.from(brandIds),
      ).catch(() => []),
      this.findActiveFlashSales(variantIds).catch(() => new Map<number, AppliedFlashSale>()),
      this.findAutoPromotionsByVariant(perItem).catch(() => new Map<number, AppliedPromotion[]>()),
    ]);

    const enrichment: BuildEnrichment = {
      applicableCoupons,
      flashSaleByVariant,
      promotionsByVariant,
    };
    return MySavedBuildDetailDto.fromEntityWithBrands(build, brandsByProduct, enrichment);
  }

  // ── Create ────────────────────────────────────────────────────────────────
  async create(dto: CreateSavedBuildDto, khachHangId: number): Promise<MySavedBuildSummaryDto> {
    const count = await this.buildRepo.count({ where: { khachHangId } });
    if (count >= MAX_BUILDS_PER_CUSTOMER) {
      throw new BadRequestException(`Bạn chỉ có thể lưu tối đa ${MAX_BUILDS_PER_CUSTOMER} cấu hình. Vui lòng xoá bớt trước khi lưu thêm.`);
    }

    // Save parent first, then insert children with explicit buildId — TypeORM
    // cascade does not auto-populate buildId when the entity declares both
    // `@Column buildId` and `@ManyToOne build` on the same column.
    const saved = await this.buildRepo.save(
      this.buildRepo.create({
        tenBuild: dto.tenBuild ?? 'Cấu hình của tôi',
        moTa: dto.moTa ?? null,
        trangThai: dto.trangThai ?? 'draft',
        isPublic: Boolean(dto.isPublic),
        khachHangId,
      }),
    );

    if (dto.details?.length) {
      const details = dto.details.map((d) =>
        this.detailRepo.create({ ...d, buildId: saved.id }),
      );
      await this.detailRepo.save(details);
    }

    this.auditLogsService.log({
      entityType: 'SavedBuild',
      entityId: String(saved.id),
      entityLabel: saved.tenBuild ?? `Build #${saved.id}`,
      actionType: 'CREATE',
      actionDetail: `Khách hàng lưu cấu hình Build PC "${saved.tenBuild ?? ''}" (${dto.details?.length ?? 0} linh kiện)`,
      after: JSON.stringify({ id: saved.id, khachHangId, tenBuild: saved.tenBuild, isPublic: saved.isPublic }),
    });
    return this.findOne(saved.id, khachHangId);
  }

  // ── Update ────────────────────────────────────────────────────────────────
  async update(id: number, dto: UpdateSavedBuildDto, khachHangId: number): Promise<MySavedBuildSummaryDto> {
    const build = await this.buildRepo.findOne({ where: { id }, relations: ['details'] });
    if (!build) throw new NotFoundException('Build không tồn tại');
    if (build.khachHangId !== khachHangId) throw new ForbiddenException('Không có quyền sửa');

    const before = { tenBuild: build.tenBuild, isPublic: build.isPublic, trangThai: build.trangThai };
    if (dto.tenBuild !== undefined) build.tenBuild = dto.tenBuild;
    if (dto.moTa !== undefined) build.moTa = dto.moTa ?? null;
    if (dto.trangThai !== undefined) build.trangThai = dto.trangThai;
    if (dto.isPublic !== undefined) build.isPublic = Boolean(dto.isPublic);

    // Replace details outside the cascade path to avoid the same FK gap as create().
    const replaceDetails = dto.details !== undefined;
    if (replaceDetails) {
      await this.detailRepo.delete({ buildId: id });
      build.details = [];
    }

    await this.buildRepo.save(build);

    if (replaceDetails && dto.details!.length > 0) {
      const newDetails = dto.details!.map((d) =>
        this.detailRepo.create({ ...d, buildId: id }),
      );
      await this.detailRepo.save(newDetails);
    }
    this.auditLogsService.log({
      entityType: 'SavedBuild',
      entityId: String(id),
      entityLabel: build.tenBuild ?? `Build #${id}`,
      actionType: 'UPDATE',
      actionDetail: `Khách hàng cập nhật Build PC "${build.tenBuild ?? ''}"`,
      before: JSON.stringify(before),
      after: JSON.stringify({ tenBuild: build.tenBuild, isPublic: build.isPublic, trangThai: build.trangThai }),
    });
    return this.findOne(id, khachHangId);
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async remove(id: number, khachHangId: number): Promise<void> {
    const build = await this.buildRepo.findOne({ where: { id } });
    if (!build) throw new NotFoundException('Build không tồn tại');
    if (build.khachHangId !== khachHangId) throw new ForbiddenException('Không có quyền xoá');
    await this.buildRepo.remove(build);
    this.auditLogsService.log({
      entityType: 'SavedBuild',
      entityId: String(id),
      entityLabel: build.tenBuild ?? `Build #${id}`,
      actionType: 'DELETE',
      actionDetail: `Khách hàng xóa cấu hình Build PC "${build.tenBuild ?? ''}"`,
      before: JSON.stringify({ id: build.id, khachHangId, tenBuild: build.tenBuild }),
    });
  }
}
