import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from './entities/banner.entity';
import { BannerResponseDto, mapBanner } from './dto/banner-response.dto';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { QueryBannersDto } from './dto/query-banners.dto';
import { UpdateBannersLayoutDto } from './dto/update-banners-layout.dto';
import { ReorderBannersDto } from './dto/reorder-banners.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(Banner)
    private readonly repo: Repository<Banner>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(query: QueryBannersDto) {
    const { page = 1, limit = 20, q, position, status } = query;
    const qb = this.repo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.createdBy', 'createdBy')
      .orderBy('b.sortOrder', 'ASC');

    if (q) qb.andWhere('b.title LIKE :q', { q: `%${q}%` });
    if (position?.length) qb.andWhere('b.position IN (:...position)', { position });
    if (status?.length) qb.andWhere('b.status IN (:...status)', { status });

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

  async findPublic(position: string) {
    const now = new Date();
    return this.repo
      .createQueryBuilder('b')
      .where('b.position = :position', { position })
      .andWhere('b.status = :status', { status: 'active' })
      .andWhere('(b.startDate IS NULL OR b.startDate <= :now)', { now })
      .andWhere('(b.endDate IS NULL OR b.endDate >= :now)', { now })
      .orderBy('b.sortOrder', 'ASC')
      .getMany();
  }

  async findOne(id: number): Promise<BannerResponseDto> {
    return mapBanner(await this.loadOne(id));
  }

  private static readonly POSITION_LIMITS: Partial<Record<string, { max: number; label: string }>> = {
    homepage_hero:  { max: 1, label: 'Hero trang chủ' },
    homepage_small: { max: 4, label: '4 banner nhỏ' },
    side_banner:    { max: 2, label: 'Side Banner' },
  };

  async create(dto: CreateBannerDto, createdById: number): Promise<BannerResponseDto> {
    const limit = BannersService.POSITION_LIMITS[dto.position];
    if (limit) {
      const count = await this.repo.countBy({ position: dto.position });
      if (count >= limit.max) {
        throw new BadRequestException(
          `Vị trí "${limit.label}" chỉ cho phép tối đa ${limit.max} banner (hiện có ${count})`,
        );
      }
    }
    const banner = this.repo.create({ ...dto, createdById, updatedById: createdById });
    const saved = await this.repo.save(banner);
    const full = await this.loadOne(saved.id);
    this.auditLogsService.log({
      entityType: 'Banner',
      entityId: String(full.id),
      entityLabel: full.title,
      actionType: 'TaoMoi',
      actionDetail: `Tạo banner "${full.title}" (vị trí: ${full.position}, trạng thái: ${full.status})`,
      after: JSON.stringify({ id: full.id, title: full.title, position: full.position, status: full.status, startDate: full.startDate, endDate: full.endDate }),
    });
    return mapBanner(full);
  }

  async update(id: number, dto: UpdateBannerDto, updatedById: number): Promise<BannerResponseDto> {
    const before = await this.loadOne(id);
    await this.repo.update(id, { ...dto, updatedById });
    const updated = await this.loadOne(id);
    this.auditLogsService.log({
      entityType: 'Banner',
      entityId: String(id),
      entityLabel: updated.title,
      actionType: 'CapNhat',
      actionDetail: `Cập nhật banner "${updated.title}"`,
      before: JSON.stringify({ title: before.title, position: before.position, status: before.status, startDate: before.startDate, endDate: before.endDate, linkUrl: before.linkUrl }),
      after: JSON.stringify({ title: updated.title, position: updated.position, status: updated.status, startDate: updated.startDate, endDate: updated.endDate, linkUrl: updated.linkUrl }),
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
      actionDetail: `Xóa banner "${banner.title}" (vị trí: ${banner.position})`,
      before: JSON.stringify({ id: banner.id, title: banner.title, position: banner.position, status: banner.status }),
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
      entityLabel: 'Sắp xếp lại banner',
      actionType: 'CapNhat',
      actionDetail: `Sắp xếp lại thứ tự ${dto.ids.length} banner`,
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
      entityLabel: 'Cập nhật layout banner',
      actionType: 'CapNhat',
      actionDetail: `Cập nhật vị trí grid cho ${dto.items.length} banner`,
      after: JSON.stringify({ items: dto.items.map(i => ({ id: i.id, gridX: i.gridX, gridY: i.gridY, gridW: i.gridW, gridH: i.gridH })) }),
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
