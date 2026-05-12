import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from '../entities/banner.entity';
import { BannerResponseDto, PublicBannerDto, mapBanner, mapPublicBanner } from '../dto/banner-response.dto';
import { CreateBannerDto } from '../dto/create-banner.dto';
import { UpdateBannerDto } from '../dto/update-banner.dto';
import { QueryBannersDto } from '../dto/query-banners.dto';
import { UpdateBannersLayoutDto } from '../dto/update-banners-layout.dto';
import { ReorderBannersDto } from '../dto/reorder-banners.dto';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { SiteConfigService } from './site-config.service';

@Injectable()
export class BannersService {
  private static readonly ACTIVE_LIMITS: Partial<Record<string, { max: number; label: string }>> = {
    homepage_hero: { max: 1, label: 'Hero trang chu' },
    homepage_small: { max: 4, label: '4 banner nho' },
    side_banner: { max: 2, label: 'Side Banner' },
  };

  constructor(
    @InjectRepository(Banner)
    private readonly repo: Repository<Banner>,
    private readonly auditLogsService: AuditLogsService,
    private readonly siteConfigService: SiteConfigService,
  ) {}

  private normalizeStatus(status?: string | null): 'draft' | 'active' {
    return status === 'active' ? 'active' : 'draft';
  }

  private resolveEnabledState(banner: Pick<Banner, 'isEnabled' | 'status'>): boolean {
    if (typeof banner.isEnabled === 'boolean') return banner.isEnabled;
    return this.normalizeStatus(banner.status) === 'active';
  }

  private normalizeSidePlacement(
    position: string,
    sidePlacement?: string | null,
  ): 'left' | 'right' | null {
    if (position !== 'side_banner') {
      return null;
    }

    if (sidePlacement === 'left' || sidePlacement === 'right') {
      return sidePlacement;
    }

    throw new BadRequestException('Side banner bắt buộc phải có vị trí trái hoặc phải');
  }

  private expandStatusFilter(statuses?: string[]): string[] | undefined {
    if (!statuses?.length) return undefined;

    const expanded = new Set<string>();
    for (const status of statuses) {
      if (status === 'active') {
        expanded.add('active');
      } else if (status === 'draft') {
        expanded.add('draft');
        expanded.add('scheduled');
        expanded.add('ended');
      }
    }

    return expanded.size ? [...expanded] : undefined;
  }

  private async filterHeroByMode(positions: string[]): Promise<string[]> {
    const hasHero = positions.includes('homepage_hero');
    const hasSlider = positions.includes('homepage_hero_slider');
    if (!hasHero && !hasSlider) return positions;
    const mode = await this.siteConfigService.getHomepageHeroMode();
    const excluded = mode === 'slider' ? 'homepage_hero' : 'homepage_hero_slider';
    return positions.filter((position) => position !== excluded);
  }

  private applyPublicLimit(position: string, items: Banner[]): Banner[] {
    const limit = BannersService.ACTIVE_LIMITS[position];
    return limit ? items.slice(0, limit.max) : items;
  }

  private async ensureActiveLimit(position: string, shouldEnable: boolean, excludeId?: number): Promise<void> {
    if (!shouldEnable) return;

    const limit = BannersService.ACTIVE_LIMITS[position];
    if (!limit) return;

    const existing = await this.repo.find({
      where: { position },
      order: { sortOrder: 'ASC' },
    });

    const activeCount = existing.filter(
      (banner) => banner.id !== excludeId && this.resolveEnabledState(banner),
    ).length;

    if (activeCount >= limit.max) {
      throw new BadRequestException(
        `Vị trí "${limit.label}" chỉ cho phép tối đa ${limit.max} banner được kích hoạt`,
      );
    }
  }

  private async ensureSidePlacementAvailable(
    position: string,
    sidePlacement: 'left' | 'right' | null,
    shouldEnable: boolean,
    excludeId?: number,
  ): Promise<void> {
    if (position !== 'side_banner' || !shouldEnable || !sidePlacement) {
      return;
    }

    const existing = await this.repo.find({
      where: { position, sidePlacement },
      order: { sortOrder: 'ASC' },
    });

    const enabledCount = existing.filter(
      (banner) => banner.id !== excludeId && this.resolveEnabledState(banner),
    ).length;

    if (enabledCount >= 1) {
      throw new BadRequestException(
        `Đã có một side banner đang kích hoạt ở bên ${sidePlacement === 'left' ? 'trái' : 'phải'}`,
      );
    }
  }

  async findAll(query: QueryBannersDto) {
    const { page = 1, limit = 20, q, position, status } = query;
    const expandedStatus = this.expandStatusFilter(status);
    const qb = this.repo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.createdBy', 'createdBy')
      .orderBy('b.sortOrder', 'ASC');

    if (q) qb.andWhere('b.title LIKE :q', { q: `%${q}%` });
    if (position?.length) qb.andWhere('b.position IN (:...position)', { position });
    if (expandedStatus?.length) qb.andWhere('b.status IN (:...status)', { status: expandedStatus });

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: items.map(mapBanner),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findPublic(position: string): Promise<PublicBannerDto[]> {
    const allowed = await this.filterHeroByMode([position]);
    if (allowed.length === 0) return [];

    const items = await this.repo
      .createQueryBuilder('b')
      .where('b.position = :position', { position })
      .andWhere('b.status = :status', { status: 'active' })
      .orderBy('b.sortOrder', 'ASC')
      .getMany();

    return this.applyPublicLimit(
      position,
      items.filter((item) => this.resolveEnabledState(item)),
    ).map(mapPublicBanner);
  }

  async findPublicMany(positions: string[]): Promise<PublicBannerDto[]> {
    const allowed = await this.filterHeroByMode(positions);
    if (allowed.length === 0) return [];

    const items = await this.repo
      .createQueryBuilder('b')
      .where('b.position IN (:...positions)', { positions: allowed })
      .andWhere('b.status = :status', { status: 'active' })
      .orderBy('b.position', 'ASC')
      .addOrderBy('b.sortOrder', 'ASC')
      .getMany();

    const grouped = new Map<string, Banner[]>();
    for (const item of items) {
      if (!this.resolveEnabledState(item)) continue;
      const list = grouped.get(item.position) ?? [];
      list.push(item);
      grouped.set(item.position, list);
    }

    return allowed
      .flatMap((positionKey) => this.applyPublicLimit(positionKey, grouped.get(positionKey) ?? []))
      .map(mapPublicBanner);
  }

  async findOne(id: number): Promise<BannerResponseDto> {
    return mapBanner(await this.loadOne(id));
  }

  async create(dto: CreateBannerDto, createdById: number): Promise<BannerResponseDto> {
    const status = this.normalizeStatus(dto.status);
    const isEnabled = dto.isEnabled ?? false;
    const sidePlacement = this.normalizeSidePlacement(dto.position, dto.sidePlacement);

    if (isEnabled && status !== 'active') {
      throw new BadRequestException('Chỉ có thể kích hoạt banner ở trạng thái hoạt động');
    }

    await this.ensureActiveLimit(dto.position, isEnabled);
    await this.ensureSidePlacementAvailable(dto.position, sidePlacement, isEnabled);

    const banner = this.repo.create({
      ...dto,
      status,
      isEnabled,
      sidePlacement,
      startDate: null,
      endDate: null,
      createdById,
      updatedById: createdById,
    });
    const saved = await this.repo.save(banner);
    const full = await this.loadOne(saved.id);

    this.auditLogsService.log({
      entityType: 'Banner',
      entityId: String(full.id),
      entityLabel: full.title,
      actionType: 'TaoMoi',
      actionDetail: `Tao banner "${full.title}" (vi tri: ${full.position}, trang thai: ${this.normalizeStatus(full.status)}, kich hoat: ${this.resolveEnabledState(full)})`,
      after: JSON.stringify({
        id: full.id,
        title: full.title,
        position: full.position,
        status: this.normalizeStatus(full.status),
        isEnabled: this.resolveEnabledState(full),
        sidePlacement: full.sidePlacement,
      }),
    });
    return mapBanner(full);
  }

  async update(id: number, dto: UpdateBannerDto, updatedById: number): Promise<BannerResponseDto> {
    const before = await this.loadOne(id);
    const nextStatus = dto.status !== undefined
      ? this.normalizeStatus(dto.status)
      : this.normalizeStatus(before.status);
    let nextIsEnabled = dto.isEnabled !== undefined
      ? dto.isEnabled
      : this.resolveEnabledState(before);

    if (nextStatus !== 'active') {
      if (dto.isEnabled === true) {
        throw new BadRequestException('Chỉ có thể kích hoạt banner ở trạng thái hoạt động');
      }
      nextIsEnabled = false;
    }

    const nextPosition = dto.position ?? before.position;
    const nextSidePlacement = this.normalizeSidePlacement(
      nextPosition,
      dto.sidePlacement ?? before.sidePlacement,
    );

    await this.ensureActiveLimit(nextPosition, nextIsEnabled, id);
    await this.ensureSidePlacementAvailable(nextPosition, nextSidePlacement, nextIsEnabled, id);

    await this.repo.update(id, {
      ...dto,
      status: nextStatus,
      isEnabled: nextIsEnabled,
      sidePlacement: nextSidePlacement,
      startDate: null,
      endDate: null,
      updatedById,
    });
    const updated = await this.loadOne(id);

    this.auditLogsService.log({
      entityType: 'Banner',
      entityId: String(id),
      entityLabel: updated.title,
      actionType: 'CapNhat',
      actionDetail: `Cap nhat banner "${updated.title}"`,
      before: JSON.stringify({
        title: before.title,
        position: before.position,
        status: this.normalizeStatus(before.status),
        isEnabled: this.resolveEnabledState(before),
        sidePlacement: before.sidePlacement,
        linkUrl: before.linkUrl,
      }),
      after: JSON.stringify({
        title: updated.title,
        position: updated.position,
        status: this.normalizeStatus(updated.status),
        isEnabled: this.resolveEnabledState(updated),
        sidePlacement: updated.sidePlacement,
        linkUrl: updated.linkUrl,
      }),
    });
    return mapBanner(updated);
  }

  async remove(id: number): Promise<void> {
    const banner = await this.loadOne(id);
    await this.repo.delete(id);
    this.auditLogsService.log({
      entityType: 'Banner',
      entityId: String(id),
      entityLabel: banner.title,
      actionType: 'Xoa',
      actionDetail: `Xoa banner "${banner.title}" (vi tri: ${banner.position})`,
      before: JSON.stringify({
        id: banner.id,
        title: banner.title,
        position: banner.position,
        status: this.normalizeStatus(banner.status),
        isEnabled: this.resolveEnabledState(banner),
        sidePlacement: banner.sidePlacement,
      }),
    });
  }

  async reorder(dto: ReorderBannersDto): Promise<void> {
    await Promise.all(
      dto.ids.map((id, idx) =>
        this.repo.update(Number(id), { sortOrder: idx + 1 }),
      ),
    );
    this.auditLogsService.log({
      entityType: 'Banner',
      entityId: 'batch',
      entityLabel: 'Sap xep lai banner',
      actionType: 'CapNhat',
      actionDetail: `Sap xep lai thu tu ${dto.ids.length} banner`,
      after: JSON.stringify({ newOrder: dto.ids }),
    });
  }

  async updateLayout(dto: UpdateBannersLayoutDto): Promise<void> {
    await Promise.all(
      dto.items.map(({ id, gridX, gridY, gridW, gridH }) =>
        this.repo.update(Number(id), { gridX, gridY, gridW, gridH }),
      ),
    );
    this.auditLogsService.log({
      entityType: 'Banner',
      entityId: 'batch',
      entityLabel: 'Cap nhat layout banner',
      actionType: 'CapNhat',
      actionDetail: `Cap nhat vi tri grid cho ${dto.items.length} banner`,
      after: JSON.stringify({
        items: dto.items.map((item) => ({
          id: item.id,
          gridX: item.gridX,
          gridY: item.gridY,
          gridW: item.gridW,
          gridH: item.gridH,
        })),
      }),
    });
  }

  private async loadOne(id: number): Promise<Banner> {
    const banner = await this.repo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.createdBy', 'createdBy')
      .where('b.id = :id', { id })
      .getOne();

    if (!banner) throw new NotFoundException('Banner không tồn tại');
    return banner;
  }
}
