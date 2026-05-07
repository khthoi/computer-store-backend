import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FaqGroup } from './entities/faq-group.entity';
import { FaqItem } from './entities/faq-item.entity';
import { CreateFaqGroupDto } from './dto/create-faq-group.dto';
import { UpdateFaqGroupDto } from './dto/update-faq-group.dto';
import { CreateFaqItemDto } from './dto/create-faq-item.dto';
import { UpdateFaqItemDto } from './dto/update-faq-item.dto';
import { FaqGroupResponseDto } from './dto/faq-group-response.dto';
import { FaqItemResponseDto } from './dto/faq-item-response.dto';

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

  async findAllGroups(): Promise<FaqGroupResponseDto[]> {
    const groups = await this.groupRepo
      .createQueryBuilder('g')
      .loadRelationCountAndMap('g.itemCount', 'g.items')
      .orderBy('g.sortOrder', 'ASC')
      .getMany();
    return groups.map((g) => FaqGroupResponseDto.from(g as FaqGroup & { itemCount?: number }));
  }

  async findOneGroup(id: number): Promise<FaqGroupResponseDto> {
    const group = await this.groupRepo
      .createQueryBuilder('g')
      .loadRelationCountAndMap('g.itemCount', 'g.items')
      .where('g.id = :id', { id })
      .getOne();
    if (!group) throw new NotFoundException('Nhóm FAQ không tồn tại');
    return FaqGroupResponseDto.from(group as FaqGroup & { itemCount?: number });
  }

  async createGroup(dto: CreateFaqGroupDto): Promise<FaqGroupResponseDto> {
    const existing = await this.groupRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Slug đã tồn tại');
    const saved = await this.groupRepo.save(this.groupRepo.create(dto));
    return this.findOneGroup(saved.id);
  }

  async updateGroup(id: number, dto: UpdateFaqGroupDto): Promise<FaqGroupResponseDto> {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Nhóm FAQ không tồn tại');
    if (dto.slug) {
      const existing = await this.groupRepo.findOne({ where: { slug: dto.slug } });
      if (existing && existing.id !== id) throw new ConflictException('Slug đã tồn tại');
    }
    await this.groupRepo.update(id, dto);
    return this.findOneGroup(id);
  }

  async removeGroup(id: number): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Nhóm FAQ không tồn tại');
    await this.groupRepo.delete(id);
  }

  async reorderGroups(ids: number[]): Promise<void> {
    await Promise.all(ids.map((id, idx) => this.groupRepo.update(id, { sortOrder: idx + 1 })));
  }

  async reorderItems(ids: number[]): Promise<void> {
    await Promise.all(ids.map((id, idx) => this.itemRepo.update(id, { sortOrder: idx + 1 })));
  }

  async findAllItems(params: {
    groupId?: number;
    q?: string;
    isVisible?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: FaqItemResponseDto[]; total: number }> {
    const { groupId, q, isVisible, page = 1, pageSize } = params;
    const qb = this.itemRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.group', 'g')
      .orderBy('i.sortOrder', 'ASC');

    if (groupId !== undefined) qb.andWhere('i.groupId = :groupId', { groupId });
    if (isVisible !== undefined) qb.andWhere('i.isVisible = :isVisible', { isVisible });
    if (q) qb.andWhere('i.question LIKE :q', { q: `%${q}%` });

    if (pageSize) {
      qb.skip((page - 1) * pageSize).take(pageSize);
      const [data, total] = await qb.getManyAndCount();
      return { data: data.map(FaqItemResponseDto.from), total };
    }

    const data = await qb.getMany();
    return { data: data.map(FaqItemResponseDto.from), total: data.length };
  }

  async findOneItem(id: number): Promise<FaqItem> {
    const item = await this.itemRepo.findOne({ where: { id }, relations: ['group'] });
    if (!item) throw new NotFoundException('FAQ không tồn tại');
    return item;
  }

  async createItem(dto: CreateFaqItemDto): Promise<FaqItemResponseDto> {
    const group = await this.groupRepo.findOne({ where: { id: dto.groupId } });
    if (!group) throw new NotFoundException('Nhóm FAQ không tồn tại');
    const saved = await this.itemRepo.save(this.itemRepo.create(dto));
    const item = await this.findOneItem(saved.id);
    return FaqItemResponseDto.from(item);
  }

  async updateItem(id: number, dto: UpdateFaqItemDto): Promise<FaqItemResponseDto> {
    await this.findOneItem(id);
    await this.itemRepo.update(id, dto);
    const item = await this.findOneItem(id);
    return FaqItemResponseDto.from(item);
  }

  async removeItem(id: number): Promise<void> {
    await this.findOneItem(id);
    await this.itemRepo.delete(id);
  }

  async incrementHelpful(id: number): Promise<void> {
    await this.findOneItem(id);
    await this.itemRepo.increment({ id }, 'helpfulCount', 1);
  }
}
