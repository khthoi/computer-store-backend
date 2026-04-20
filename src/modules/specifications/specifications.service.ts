import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpecGroup } from './entities/spec-group.entity';
import { SpecType } from './entities/spec-type.entity';
import { CategorySpecGroup } from './entities/category-spec-group.entity';
import { SpecValue } from './entities/spec-value.entity';
import { CreateSpecGroupDto } from './dto/create-spec-group.dto';
import { CreateSpecTypeDto } from './dto/create-spec-type.dto';
import { LinkCategoryGroupDto } from './dto/link-category-group.dto';
import { SaveSpecValuesDto } from './dto/save-spec-values.dto';

@Injectable()
export class SpecificationsService {
  constructor(
    @InjectRepository(SpecGroup) private readonly groupRepo: Repository<SpecGroup>,
    @InjectRepository(SpecType) private readonly typeRepo: Repository<SpecType>,
    @InjectRepository(CategorySpecGroup) private readonly catGroupRepo: Repository<CategorySpecGroup>,
    @InjectRepository(SpecValue) private readonly valueRepo: Repository<SpecValue>,
  ) {}

  // ── Groups ────────────────────────────────────────────────────────────────

  findAllGroups(): Promise<SpecGroup[]> {
    return this.groupRepo.find({ relations: ['types'], order: { tenNhom: 'ASC' } });
  }

  async createGroup(dto: CreateSpecGroupDto): Promise<SpecGroup> {
    return this.groupRepo.save(this.groupRepo.create(dto));
  }

  async updateGroup(id: number, dto: CreateSpecGroupDto): Promise<SpecGroup> {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Nhóm thông số không tồn tại');
    Object.assign(group, dto);
    return this.groupRepo.save(group);
  }

  async removeGroup(id: number): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Nhóm thông số không tồn tại');
    await this.groupRepo.remove(group);
  }

  // ── Types ─────────────────────────────────────────────────────────────────

  findAllTypes(): Promise<SpecType[]> {
    return this.typeRepo.find({ relations: ['group'], order: { thuTuHienThi: 'ASC' } });
  }

  async createType(dto: CreateSpecTypeDto): Promise<SpecType> {
    if (dto.maKyThuat) {
      const exists = await this.typeRepo.findOne({ where: { maKyThuat: dto.maKyThuat } });
      if (exists) throw new ConflictException(`Mã kỹ thuật "${dto.maKyThuat}" đã tồn tại`);
    }
    return this.typeRepo.save(this.typeRepo.create(dto));
  }

  async updateType(id: number, dto: Partial<CreateSpecTypeDto>): Promise<SpecType> {
    const type = await this.typeRepo.findOne({ where: { id } });
    if (!type) throw new NotFoundException('Loại thông số không tồn tại');
    Object.assign(type, dto);
    return this.typeRepo.save(type);
  }

  async removeType(id: number): Promise<void> {
    const type = await this.typeRepo.findOne({ where: { id } });
    if (!type) throw new NotFoundException('Loại thông số không tồn tại');
    await this.typeRepo.remove(type);
  }

  // ── Category ↔ Group links ────────────────────────────────────────────────

  findGroupsByCategory(danhMucId: number): Promise<CategorySpecGroup[]> {
    return this.catGroupRepo.find({
      where: { danhMucId },
      order: { thuTuHienThi: 'ASC' },
    });
  }

  async linkCategoryGroup(dto: LinkCategoryGroupDto): Promise<CategorySpecGroup> {
    const exists = await this.catGroupRepo.findOne({
      where: { danhMucId: dto.danhMucId, nhomThongSoId: dto.nhomThongSoId },
    });
    if (exists) throw new ConflictException('Liên kết đã tồn tại');
    return this.catGroupRepo.save(this.catGroupRepo.create(dto));
  }

  async unlinkCategoryGroup(id: number): Promise<void> {
    const link = await this.catGroupRepo.findOne({ where: { id } });
    if (!link) throw new NotFoundException('Liên kết không tồn tại');
    await this.catGroupRepo.remove(link);
  }

  // ── Spec Values (per variant) ─────────────────────────────────────────────

  findValuesByVariant(phienBanId: number): Promise<SpecValue[]> {
    return this.valueRepo.find({
      where: { phienBanId },
      order: { loaiThongSoId: 'ASC' },
    });
  }

  async saveSpecValues(phienBanId: number, dto: SaveSpecValuesDto): Promise<SpecValue[]> {
    await this.valueRepo.delete({ phienBanId });
    const entities = dto.specs.map((item) =>
      this.valueRepo.create({ phienBanId, ...item }),
    );
    return this.valueRepo.save(entities);
  }
}
