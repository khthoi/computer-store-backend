import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FaqGroup } from './entities/faq-group.entity';
import { FaqItem } from './entities/faq-item.entity';
import { CreateFaqGroupDto } from './dto/create-faq-group.dto';
import { UpdateFaqGroupDto } from './dto/update-faq-group.dto';
import { CreateFaqItemDto } from './dto/create-faq-item.dto';
import { UpdateFaqItemDto } from './dto/update-faq-item.dto';

@Injectable()
export class FaqService {
  constructor(
    @InjectRepository(FaqGroup)
    private readonly groupRepo: Repository<FaqGroup>,
    @InjectRepository(FaqItem)
    private readonly itemRepo: Repository<FaqItem>,
  ) {}

  async findAllPublic() {
    return this.groupRepo.find({
      where: { isVisible: true },
      relations: ['items'],
      order: { sortOrder: 'ASC' },
    });
  }

  async findAllGroups() {
    return this.groupRepo.find({ order: { sortOrder: 'ASC' } });
  }

  async findOneGroup(id: number) {
    const group = await this.groupRepo.findOne({ where: { id }, relations: ['items'] });
    if (!group) throw new NotFoundException('Nhóm FAQ không tồn tại');
    return group;
  }

  async createGroup(dto: CreateFaqGroupDto) {
    const existing = await this.groupRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Slug đã tồn tại');
    return this.groupRepo.save(this.groupRepo.create(dto));
  }

  async updateGroup(id: number, dto: UpdateFaqGroupDto) {
    await this.findOneGroup(id);
    if (dto.slug) {
      const existing = await this.groupRepo.findOne({ where: { slug: dto.slug } });
      if (existing && existing.id !== id) throw new ConflictException('Slug đã tồn tại');
    }
    await this.groupRepo.update(id, dto);
    return this.findOneGroup(id);
  }

  async removeGroup(id: number) {
    await this.findOneGroup(id);
    await this.groupRepo.delete(id);
  }

  async findAllItems(groupId?: number) {
    const where = groupId ? { groupId } : {};
    return this.itemRepo.find({ where, order: { sortOrder: 'ASC' } });
  }

  async findOneItem(id: number) {
    const item = await this.itemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('FAQ không tồn tại');
    return item;
  }

  async createItem(dto: CreateFaqItemDto) {
    const group = await this.groupRepo.findOne({ where: { id: dto.groupId } });
    if (!group) throw new NotFoundException('Nhóm FAQ không tồn tại');
    return this.itemRepo.save(this.itemRepo.create(dto));
  }

  async updateItem(id: number, dto: UpdateFaqItemDto) {
    await this.findOneItem(id);
    await this.itemRepo.update(id, dto);
    return this.findOneItem(id);
  }

  async removeItem(id: number) {
    await this.findOneItem(id);
    await this.itemRepo.delete(id);
  }

  async incrementHelpful(id: number) {
    await this.findOneItem(id);
    await this.itemRepo.increment({ id }, 'luot_huu_ich', 1);
  }
}
