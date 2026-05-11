import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Page } from '../entities/page.entity';
import { CreatePageDto } from '../dto/create-page.dto';
import { UpdatePageDto } from '../dto/update-page.dto';
import { PageResponseDto, toPageResponse } from '../dto/page-response.dto';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';

const STATUS_TO_DB: Record<string, string> = {
  draft: 'nhap',
  published: 'da_xuat_ban',
  archived: 'an',
};

function mapStatus(status: string | undefined): string | undefined {
  if (!status) return undefined;
  return STATUS_TO_DB[status] ?? status;
}

export interface PageListQuery {
  q?: string;
  status?: string | string[];
  page?: number;
  pageSize?: number;
}

@Injectable()
export class PagesService {
  constructor(
    @InjectRepository(Page)
    private readonly repo: Repository<Page>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAllPublic() {
    return this.repo.find({
      where: { status: 'da_xuat_ban' },
      order: { sortOrder: 'ASC' },
      select: ['id', 'type', 'slug', 'title', 'showInFooter', 'sortOrder', 'publishedAt'],
    });
  }

  async findBySlugPublic(slug: string) {
    const page = await this.repo.findOne({ where: { slug, status: 'da_xuat_ban' } });
    if (!page) throw new NotFoundException('Trang không tồn tại');
    return page;
  }

  async findAll(query: PageListQuery = {}): Promise<{ data: PageResponseDto[]; total: number; page: number; limit: number; totalPages: number }> {
    const { q, page = 1, pageSize = 20 } = query;
    const limit = pageSize;
    const skip = (page - 1) * limit;

    const rawStatuses = Array.isArray(query.status)
      ? query.status
      : query.status
      ? [query.status]
      : [];
    const dbStatuses = rawStatuses.map((s) => mapStatus(s) ?? s);

    const qb = this.repo.createQueryBuilder('p')
      .leftJoinAndSelect('p.createdBy', 'createdBy')
      .orderBy('p.sortOrder', 'ASC')
      .skip(skip)
      .take(limit);

    if (q) {
      qb.andWhere('(p.title LIKE :q OR p.slug LIKE :q)', { q: `%${q}%` });
    }
    if (dbStatuses.length) {
      qb.andWhere('p.status IN (:...statuses)', { statuses: dbStatuses });
    }

    const [entities, total] = await qb.getManyAndCount();
    return {
      data: entities.map(toPageResponse),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<PageResponseDto> {
    const page = await this.repo.findOne({ where: { id }, relations: ['createdBy'] });
    if (!page) throw new NotFoundException('Trang không tồn tại');
    return toPageResponse(page);
  }

  async create(dto: CreatePageDto, createdById: number): Promise<PageResponseDto> {
    const existing = await this.repo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Slug đã tồn tại');
    const page = this.repo.create({
      ...dto,
      type: dto.type ?? 'custom',
      status: mapStatus(dto.status) ?? 'nhap',
      createdById,
      updatedById: createdById,
    });
    const saved = await this.repo.save(page);
    this.auditLogsService.log({
      entityType: 'Page',
      entityId: String(saved.id),
      entityLabel: saved.title,
      actionType: 'TaoMoi',
      actionDetail: `Tạo trang nội dung "${saved.title}" (slug: ${saved.slug}, loại: ${saved.type}, trạng thái: ${saved.status})`,
      after: JSON.stringify({ id: saved.id, title: saved.title, slug: saved.slug, type: saved.type, status: saved.status, showInFooter: saved.showInFooter }),
    });
    const withRelation = await this.repo.findOne({ where: { id: saved.id }, relations: ['createdBy'] });
    return toPageResponse(withRelation!);
  }

  async update(id: number, dto: UpdatePageDto, updatedById: number): Promise<PageResponseDto> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Trang không tồn tại');
    if (dto.slug && dto.slug !== existing.slug) {
      const slugConflict = await this.repo.findOne({ where: { slug: dto.slug } });
      if (slugConflict) throw new ConflictException('Slug đã tồn tại');
    }
    await this.repo.update(id, {
      ...dto,
      ...(dto.status ? { status: mapStatus(dto.status) ?? dto.status } : {}),
      updatedById,
    });
    const updated = await this.repo.findOne({ where: { id } });
    this.auditLogsService.log({
      entityType: 'Page',
      entityId: String(id),
      entityLabel: updated!.title,
      actionType: 'CapNhat',
      actionDetail: `Cập nhật trang "${updated!.title}" (trạng thái: ${existing.status} → ${updated!.status})`,
      before: JSON.stringify({ title: existing.title, slug: existing.slug, status: existing.status, content: (existing.content ?? '').substring(0, 100) + '...' }),
      after: JSON.stringify({ title: updated!.title, slug: updated!.slug, status: updated!.status }),
    });
    return this.findOne(id);
  }

  async reorder(ids: string[]): Promise<void> {
    await Promise.all(
      ids.map((id, idx) => this.repo.update(Number(id), { sortOrder: idx + 1 })),
    );
    this.auditLogsService.log({
      entityType: 'Page',
      entityId: 'batch',
      entityLabel: 'Sắp xếp lại trang',
      actionType: 'CapNhat',
      actionDetail: `Sắp xếp lại thứ tự ${ids.length} trang nội dung`,
      after: JSON.stringify({ newOrder: ids }),
    });
  }

  async remove(id: number): Promise<void> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Trang không tồn tại');
    await this.repo.delete(id);
    this.auditLogsService.log({
      entityType: 'Page',
      entityId: String(id),
      entityLabel: existing.title,
      actionType: 'Xoa',
      actionDetail: `Xóa trang nội dung "${existing.title}" (slug: ${existing.slug}, loại: ${existing.type})`,
      before: JSON.stringify({ id: existing.id, title: existing.title, slug: existing.slug, type: existing.type, status: existing.status }),
    });
  }
}
