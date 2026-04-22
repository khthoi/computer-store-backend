import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HomepageSection } from './entities/homepage-section.entity';
import { HomepageSectionItem } from './entities/homepage-section-item.entity';
import { CreateHomepageSectionDto } from './dto/create-homepage-section.dto';
import { UpdateHomepageSectionDto } from './dto/update-homepage-section.dto';

@Injectable()
export class HomepageService {
  constructor(
    @InjectRepository(HomepageSection)
    private readonly sectionRepo: Repository<HomepageSection>,
    @InjectRepository(HomepageSectionItem)
    private readonly itemRepo: Repository<HomepageSectionItem>,
  ) {}

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

  async findAll() {
    return this.sectionRepo.find({ relations: ['items'], order: { sortOrder: 'ASC' } });
  }

  async findOne(id: number) {
    const section = await this.sectionRepo.findOne({ where: { id }, relations: ['items'] });
    if (!section) throw new NotFoundException('Section không tồn tại');
    return section;
  }

  async create(dto: CreateHomepageSectionDto, createdById: number) {
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

  async update(id: number, dto: UpdateHomepageSectionDto) {
    await this.findOne(id);
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

  async remove(id: number) {
    await this.findOne(id);
    await this.sectionRepo.delete(id);
  }
}
