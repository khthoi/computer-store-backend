import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Page } from './entities/page.entity';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

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

  async findAll() {
    return this.repo.find({ order: { sortOrder: 'ASC' } });
  }

  async findOne(id: number) {
    const page = await this.repo.findOne({ where: { id } });
    if (!page) throw new NotFoundException('Trang không tồn tại');
    return page;
  }

  async create(dto: CreatePageDto, createdById: number) {
    const existing = await this.repo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Slug đã tồn tại');
    const page = this.repo.create({ ...dto, createdById, updatedById: createdById });
    return this.repo.save(page);
  }

  async update(id: number, dto: UpdatePageDto, updatedById: number) {
    await this.findOne(id);
    if (dto.slug) {
      const existing = await this.repo.findOne({ where: { slug: dto.slug } });
      if (existing && existing.id !== id) throw new ConflictException('Slug đã tồn tại');
    }
    await this.repo.update(id, { ...dto, updatedById });
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.repo.delete(id);
  }
}
