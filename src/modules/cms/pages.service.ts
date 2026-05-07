import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Page } from './entities/page.entity';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { PageResponseDto, toPageResponse } from './dto/page-response.dto';

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
    return this.findOne(id);
  }

  async reorder(ids: string[]): Promise<void> {
    await Promise.all(
      ids.map((id, idx) => this.repo.update(Number(id), { sortOrder: idx + 1 })),
    );
  }

  async remove(id: number): Promise<void> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Trang không tồn tại');
    await this.repo.delete(id);
  }
}
