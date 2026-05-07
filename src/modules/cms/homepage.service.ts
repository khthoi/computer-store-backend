import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HomepageSection } from './entities/homepage-section.entity';
import { HomepageSectionItem } from './entities/homepage-section-item.entity';
import { CreateHomepageSectionDto } from './dto/create-homepage-section.dto';
import { UpdateHomepageSectionDto } from './dto/update-homepage-section.dto';
import {
  HomepageSectionResponseDto,
  toHomepageSectionResponse,
} from './dto/homepage-section-response.dto';

@Injectable()
export class HomepageService {
  constructor(
    @InjectRepository(HomepageSection)
    private readonly sectionRepo: Repository<HomepageSection>,
    @InjectRepository(HomepageSectionItem)
    private readonly itemRepo: Repository<HomepageSectionItem>,
  ) {}

  private baseQuery() {
    return this.sectionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.items', 'i')
      .leftJoinAndSelect('i.variant', 'v')
      .leftJoinAndSelect('v.product', 'sp')
      .leftJoinAndSelect('v.images', 'img')
      .addOrderBy('i.sort_order', 'ASC');
  }

  async findAllPublic() {
    const now = new Date();
    return this.sectionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.items', 'i')
      .where('s.is_visible = true')
      .andWhere('(s.ngay_bat_dau IS NULL OR s.ngay_bat_dau <= :now)', { now })
      .andWhere('(s.ngay_ket_thuc IS NULL OR s.ngay_ket_thuc >= :now)', { now })
      .orderBy('s.sort_order', 'ASC')
      .addOrderBy('i.sort_order', 'ASC')
      .getMany();
  }

  async findAll(): Promise<HomepageSectionResponseDto[]> {
    const sections = await this.baseQuery()
      .orderBy('s.sort_order', 'ASC')
      .getMany();
    return sections.map(toHomepageSectionResponse);
  }

  private async findOneEntity(id: number): Promise<HomepageSection> {
    const section = await this.baseQuery()
      .where('s.id = :id', { id })
      .getOne();
    if (!section) throw new NotFoundException('Section không tồn tại');
    return section;
  }

  async findOne(id: number): Promise<HomepageSectionResponseDto> {
    return toHomepageSectionResponse(await this.findOneEntity(id));
  }

  async create(dto: CreateHomepageSectionDto, createdById: number): Promise<HomepageSectionResponseDto> {
    const { items, ...sectionData } = dto;
    const section = this.sectionRepo.create({ ...sectionData, createdById });
    const saved = await this.sectionRepo.save(section);
    if (items?.length) {
      const sectionItems = items.map((item, idx) =>
        this.itemRepo.create({ sectionId: saved.id, variantId: item.variantId, sortOrder: item.sortOrder ?? idx }),
      );
      await this.itemRepo.save(sectionItems);
    }
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateHomepageSectionDto): Promise<HomepageSectionResponseDto> {
    await this.findOneEntity(id);
    const { items, ...sectionData } = dto;
    await this.sectionRepo.update(id, sectionData);
    if (items !== undefined) {
      await this.itemRepo.delete({ sectionId: id });
      if (items.length) {
        const sectionItems = items.map((item, idx) =>
          this.itemRepo.create({ sectionId: id, variantId: item.variantId, sortOrder: item.sortOrder ?? idx }),
        );
        await this.itemRepo.save(sectionItems);
      }
    }
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOneEntity(id);
    await this.sectionRepo.delete(id);
  }

  async clone(id: number, createdById: number): Promise<HomepageSectionResponseDto> {
    const source = await this.findOneEntity(id);
    const { max } = await this.sectionRepo
      .createQueryBuilder('s')
      .select('MAX(s.sortOrder)', 'max')
      .getRawOne<{ max: number | null }>();

    const copy = this.sectionRepo.create({
      title: `${source.title} (Bản sao)`,
      subtitle: source.subtitle,
      viewAllUrl: source.viewAllUrl,
      type: source.type,
      sourceConfig: source.sourceConfig,
      sortBy: source.sortBy,
      maxProducts: source.maxProducts,
      layout: source.layout,
      badgeLabel: source.badgeLabel,
      badgeColor: source.badgeColor,
      badgeTextColor: source.badgeTextColor,
      isVisible: false,
      sortOrder: (Number(max) || 0) + 1,
      createdById,
    });
    const saved = await this.sectionRepo.save(copy);

    if (source.type === 'manual' && source.items?.length) {
      const clonedItems = source.items.map((item) =>
        this.itemRepo.create({ sectionId: saved.id, variantId: item.variantId, sortOrder: item.sortOrder }),
      );
      await this.itemRepo.save(clonedItems);
    }

    return this.findOne(saved.id);
  }

  async reorder(ids: number[]): Promise<void> {
    await Promise.all(ids.map((id, idx) => this.sectionRepo.update(id, { sortOrder: idx })));
  }
}
