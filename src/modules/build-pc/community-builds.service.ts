import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { SavedBuild } from './entities/saved-build.entity';
import { BuildDetail } from './entities/build-detail.entity';
import { Customer } from '../users/entities/customer.entity';
import { ProductImage } from '../products/entities/product-image.entity';
import { SavedBuildsService } from './saved-builds.service';
import { RedisService } from '../../common/redis/redis.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { QueryCommunityBuildsDto } from './dto/query-community-builds.dto';
import {
  CommunityBuildSummaryDto,
  CommunityBuildDetailDto,
  CommunityBuildListResponseDto,
} from './dto/community-build-response.dto';
import { MySavedBuildSummaryDto } from './dto/my-saved-build-response.dto';

const MAX_BUILDS_PER_CUSTOMER = 5;
const VIEW_RATE_LIMIT_SECONDS = 10 * 60; // 10 minutes

/**
 * Slot priority for the card thumbnail row. Lower index = higher priority
 * (shown first). Matching is substring + case-insensitive so common aliases
 * like "MAINBOARD"/"MB", "VGA", "MEMORY" still rank correctly.
 */
const SLOT_PRIORITY_KEYWORDS: string[] = ['MAIN', 'MB', 'CPU', 'CHIP', 'RAM', 'MEM', 'GPU', 'VGA'];

function slotPriorityScore(maKhe: string | null | undefined): number {
  if (!maKhe) return SLOT_PRIORITY_KEYWORDS.length + 1;
  const upper = maKhe.toUpperCase();
  for (let i = 0; i < SLOT_PRIORITY_KEYWORDS.length; i++) {
    if (upper.includes(SLOT_PRIORITY_KEYWORDS[i])) {
      // Group MAIN+MB → rank 0, CPU+CHIP → 1, RAM+MEM → 2, GPU+VGA → 3
      return Math.floor(i / 2);
    }
  }
  return SLOT_PRIORITY_KEYWORDS.length + 1;
}

@Injectable()
export class CommunityBuildsService {
  constructor(
    @InjectRepository(SavedBuild) private readonly buildRepo: Repository<SavedBuild>,
    @InjectRepository(BuildDetail) private readonly detailRepo: Repository<BuildDetail>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(ProductImage)
    private readonly imageRepo: Repository<ProductImage>,
    private readonly savedBuildsService: SavedBuildsService,
    private readonly redisService: RedisService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ── List ───────────────────────────────────────────────────────────────────
  async findCommunity(query: QueryCommunityBuildsDto): Promise<CommunityBuildListResponseDto> {
    const { page = 1, limit = 12, search, sortBy = 'newest' } = query;

    const allowedSortBy: Record<string, { col: string; dir: 'ASC' | 'DESC' }> = {
      newest: { col: 'b.ngayCapNhat', dir: 'DESC' },
      views: { col: 'b.soLuotXem', dir: 'DESC' },
      clones: { col: 'b.soLuotClone', dir: 'DESC' },
      'price-asc': { col: 'b.tongGiaUocTinh', dir: 'ASC' },
      'price-desc': { col: 'b.tongGiaUocTinh', dir: 'DESC' },
    };
    const order = allowedSortBy[sortBy] ?? allowedSortBy.newest;

    const qb = this.buildRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.details', 'd')
      .leftJoinAndSelect('d.slot', 'slot')
      .leftJoinAndSelect('d.phienBan', 'pv')
      .leftJoinAndSelect('pv.product', 'sp')
      .where('b.isPublic = 1');

    if (search) {
      qb.andWhere(
        new Brackets((sub) => {
          sub.where('b.tenBuild LIKE :s', { s: `%${search}%` }).orWhere(
            'b.moTa LIKE :s',
            { s: `%${search}%` },
          );
        }),
      );
    }

    qb.orderBy(order.col, order.dir);
    qb.skip((page - 1) * limit).take(limit);

    const [builds, total] = await qb.getManyAndCount();

    // Resolve author + thumbnails in batch to avoid N+1
    const customerIds = Array.from(
      new Set(
        builds
          .map((b) => b.khachHangId)
          .filter((x): x is number => typeof x === 'number'),
      ),
    );
    const customers = customerIds.length
      ? await this.customerRepo
          .createQueryBuilder('c')
          .select(['c.id', 'c.hoTen', 'c.anhDaiDien'])
          .where('c.id IN (:...ids)', { ids: customerIds })
          .getMany()
      : [];
    const customerById = new Map(customers.map((c) => [c.id, c]));

    const variantIds = Array.from(
      new Set(builds.flatMap((b) => (b.details ?? []).map((d) => d.phienBanId))),
    );
    const images = variantIds.length
      ? await this.imageRepo
          .createQueryBuilder('img')
          .where('img.phienBanId IN (:...ids)', { ids: variantIds })
          .andWhere("img.loaiAnh = 'AnhChinh'")
          .getMany()
      : [];
    const imageByVariant = new Map<number, string>();
    for (const img of images) {
      const variantId = (img as unknown as { phienBanId: number }).phienBanId;
      const url = (img as unknown as { urlHinhAnh: string }).urlHinhAnh;
      if (!imageByVariant.has(variantId)) imageByVariant.set(variantId, url);
    }

    const data: CommunityBuildSummaryDto[] = builds.map((b) => {
      const base = MySavedBuildSummaryDto.fromEntity(b);
      const author = b.khachHangId != null ? customerById.get(b.khachHangId) : undefined;
      const details = (b.details ?? [])
        .slice()
        // Stable secondary sort: keep original thuTu for items with the same priority
        .sort((a, b2) => {
          const pa = slotPriorityScore(a.slot?.maKhe);
          const pb = slotPriorityScore(b2.slot?.maKhe);
          if (pa !== pb) return pa - pb;
          return (a.thuTu ?? 0) - (b2.thuTu ?? 0);
        });
      const thumbnails = details
        .map((d) => {
          const url = imageByVariant.get(d.phienBanId);
          if (!url) return null;
          const variant = d.phienBan as unknown as {
            tenPhienBan?: string;
            product?: { slug?: string; tenSanPham?: string };
          } | undefined;
          const productSlug = variant?.product?.slug ?? '';
          if (!productSlug) return null;
          return {
            url,
            slotCode: d.slot?.maKhe ?? '',
            slotName: d.slot?.tenSlot ?? '',
            productSlug,
            variantId: d.phienBanId,
            productName: variant?.product?.tenSanPham ?? '',
            variantName: variant?.tenPhienBan ?? '',
          };
        })
        .filter(
          (
            t,
          ): t is {
            url: string;
            slotCode: string;
            slotName: string;
            productSlug: string;
            variantId: number;
            productName: string;
            variantName: string;
          } => t !== null,
        );
      return {
        ...base,
        authorName: author?.hoTen ?? null,
        authorAvatar: author?.anhDaiDien ?? null,
        views: b.soLuotXem ?? 0,
        clones: b.soLuotClone ?? 0,
        thumbnails,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  // ── Detail (public-only) ──────────────────────────────────────────────────
  async findCommunityOne(id: number): Promise<CommunityBuildDetailDto> {
    // findOne (without khachHangId) enforces isPublic = true via ForbiddenException
    // — we surface this as 404 since "private build" must not leak existence.
    let baseDetail;
    try {
      baseDetail = await this.savedBuildsService.findOne(id);
    } catch {
      throw new NotFoundException('Cấu hình không tồn tại hoặc không công khai');
    }

    const build = await this.buildRepo.findOne({ where: { id } });
    if (!build || !build.isPublic) {
      throw new NotFoundException('Cấu hình không tồn tại hoặc không công khai');
    }

    let authorName: string | null = null;
    let authorAvatar: string | null = null;
    if (build.khachHangId != null) {
      const author = await this.customerRepo
        .createQueryBuilder('c')
        .select(['c.id', 'c.hoTen', 'c.anhDaiDien'])
        .where('c.id = :id', { id: build.khachHangId })
        .getOne();
      authorName = author?.hoTen ?? null;
      authorAvatar = author?.anhDaiDien ?? null;
    }

    return {
      ...baseDetail,
      authorName,
      authorAvatar,
      views: build.soLuotXem ?? 0,
      clones: build.soLuotClone ?? 0,
    };
  }

  // ── View counter (rate-limited per IP) ────────────────────────────────────
  async incrementView(id: number, ipKey: string): Promise<void> {
    const build = await this.buildRepo.findOne({ where: { id } });
    if (!build || !build.isPublic) {
      throw new NotFoundException('Cấu hình không tồn tại hoặc không công khai');
    }

    const rateKey = `community_view:${ipKey}:${id}`;
    const alreadyCounted = await this.redisService.exists(rateKey);
    if (alreadyCounted) return;

    await this.buildRepo.increment({ id }, 'soLuotXem', 1);
    await this.redisService.set(rateKey, '1', VIEW_RATE_LIMIT_SECONDS);
  }

  // ── Clone ──────────────────────────────────────────────────────────────────
  async cloneToCustomer(id: number, khachHangId: number): Promise<MySavedBuildSummaryDto> {
    const source = await this.buildRepo.findOne({
      where: { id },
      relations: ['details'],
    });
    if (!source || !source.isPublic) {
      throw new NotFoundException('Cấu hình không tồn tại hoặc không công khai');
    }

    const count = await this.buildRepo.count({ where: { khachHangId } });
    if (count >= MAX_BUILDS_PER_CUSTOMER) {
      throw new BadRequestException(
        `Bạn chỉ có thể lưu tối đa ${MAX_BUILDS_PER_CUSTOMER} cấu hình. Hãy xoá bớt để clone.`,
      );
    }

    const cloneName = `[Clone] ${source.tenBuild ?? 'Cấu hình'}`.slice(0, 200);
    const newBuild = await this.buildRepo.save(
      this.buildRepo.create({
        tenBuild: cloneName,
        moTa: source.moTa ?? null,
        trangThai: 'draft',
        isPublic: false,
        slug: null,
        khachHangId,
        tongGiaUocTinh: source.tongGiaUocTinh ?? null,
        tongTdp: source.tongTdp ?? null,
      }),
    );

    if ((source.details ?? []).length > 0) {
      const newDetails = source.details.map((d) =>
        this.detailRepo.create({
          buildId: newBuild.id,
          slotId: d.slotId,
          phienBanId: d.phienBanId,
          soLuong: d.soLuong,
          giaSnapshot: d.giaSnapshot ?? null,
          thuTu: d.thuTu ?? 0,
        }),
      );
      await this.detailRepo.save(newDetails);
    }

    await this.buildRepo.increment({ id: source.id }, 'soLuotClone', 1);

    this.auditLogsService.log({
      entityType: 'SavedBuild',
      entityId: String(newBuild.id),
      entityLabel: cloneName,
      actionType: 'CLONE',
      actionDetail: `Clone cấu hình #${source.id} → #${newBuild.id} bởi khách hàng #${khachHangId}`,
      before: JSON.stringify({ sourceBuildId: source.id }),
      after: JSON.stringify({
        id: newBuild.id,
        khachHangId,
        tenBuild: cloneName,
      }),
    });

    const reloaded = await this.buildRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.details', 'd')
      .leftJoinAndSelect('d.slot', 'slot')
      .leftJoinAndSelect('d.phienBan', 'pv')
      .where('b.id = :id', { id: newBuild.id })
      .getOne();
    if (!reloaded) {
      throw new NotFoundException('Không thể tải cấu hình vừa clone');
    }
    return MySavedBuildSummaryDto.fromEntity(reloaded);
  }
}
