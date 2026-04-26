import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SpecGroup } from './entities/spec-group.entity';
import { SpecType } from './entities/spec-type.entity';
import { CategorySpecGroup } from './entities/category-spec-group.entity';
import { SpecValue } from './entities/spec-value.entity';
import { Category } from '../categories/entities/category.entity';
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
    @InjectRepository(Category) private readonly categoryRepo: Repository<Category>,
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

  async getSpecGroupsForVariant(variantId: number) {
    const values = await this.valueRepo.find({ where: { phienBanId: variantId } });
    if (!values.length) return [];

    const typeIds = values.map((v) => v.loaiThongSoId);
    const types = await this.typeRepo.find({ where: { id: In(typeIds) }, relations: ['group'] });
    const typeMap = new Map<number, SpecType>(types.map((t) => [t.id, t]));

    const groupMap = new Map<number, { group: SpecGroup; items: { value: SpecValue; type: SpecType }[] }>();
    for (const value of values) {
      const type = typeMap.get(value.loaiThongSoId);
      if (!type?.group) continue;
      if (!groupMap.has(type.nhomThongSoId)) {
        groupMap.set(type.nhomThongSoId, { group: type.group, items: [] });
      }
      groupMap.get(type.nhomThongSoId)!.items.push({ value, type });
    }

    return Array.from(groupMap.values()).map(({ group, items }) => ({
      id: String(group.id),
      label: group.tenNhom,
      inherited: false,
      items: items
        .sort((a, b) => a.type.thuTuHienThi - b.type.thuTuHienThi)
        .map(({ value, type }) => ({
          id: String(value.id),
          typeId: String(type.id),
          typeLabel: type.tenLoai,
          ...(type.moTa && { description: type.moTa }),
          ...(type.maKyThuat && { maKyThuat: type.maKyThuat }),
          kieuDuLieu: type.kieuDuLieu,
          ...(type.donVi && { donVi: type.donVi }),
          batBuoc: type.batBuoc === 'BAT_BUOC',
          coTheLoc: type.coTheLoc,
          ...(type.widgetLoc && { widgetLoc: type.widgetLoc }),
          thuTuLoc: type.thuTuLoc,
          thuTuHienThi: type.thuTuHienThi,
          value: value.giaTriThongSo,
          ...(value.giaTriChuan && { giaTriChuan: value.giaTriChuan }),
          giaTriSo: value.giaTriSo,
        })),
    }));
  }

  async getSpecTemplateForCategory(categoryId: number) {
    // Walk up the category tree (max 5 levels) to collect ancestor IDs
    const categoryIds: number[] = [];
    let currentId: number | null = categoryId;
    for (let i = 0; i < 5 && currentId != null; i++) {
      categoryIds.push(currentId);
      const cat = await this.categoryRepo.findOne({
        where: { id: currentId },
        select: ['id', 'danhMucChaId'],
      });
      currentId = cat?.danhMucChaId ?? null;
    }
    if (!categoryIds.length) return [];

    const links = await this.catGroupRepo.find({ where: { danhMucId: In(categoryIds) } });

    // De-dup by nhomThongSoId: child category (earlier in categoryIds) wins
    const resolved = new Map<number, CategorySpecGroup>();
    for (const id of categoryIds) {
      for (const link of links.filter((l) => l.danhMucId === id)) {
        if (!resolved.has(link.nhomThongSoId)) resolved.set(link.nhomThongSoId, link);
      }
    }

    const included = Array.from(resolved.values())
      .filter((l) => l.hanhDong !== 'loai_tru')
      .sort((a, b) => a.thuTuHienThi - b.thuTuHienThi);

    if (!included.length) return [];

    const groups = await this.groupRepo.find({
      where: { id: In(included.map((l) => l.nhomThongSoId)) },
      relations: ['types'],
    });
    const groupMap = new Map(groups.map((g) => [g.id, g]));

    return included
      .map((link) => {
        const group = groupMap.get(link.nhomThongSoId);
        if (!group) return null;
        return {
          id: String(group.id),
          label: group.tenNhom,
          inherited: link.danhMucId !== categoryId,
          displayOrder: link.thuTuHienThi,
          hienThiBoLoc: link.hienThiBoLoc,
          thuTuBoLoc: link.thuTuBoLoc,
          items: (group.types ?? [])
            .sort((a, b) => a.thuTuHienThi - b.thuTuHienThi)
            .map((type) => ({
              id: `template-${type.id}`,
              typeId: String(type.id),
              typeLabel: type.tenLoai,
              ...(type.moTa && { description: type.moTa }),
              ...(type.maKyThuat && { maKyThuat: type.maKyThuat }),
              kieuDuLieu: type.kieuDuLieu,
              ...(type.donVi && { donVi: type.donVi }),
              batBuoc: type.batBuoc === 'BAT_BUOC',
              coTheLoc: type.coTheLoc,
              ...(type.widgetLoc && { widgetLoc: type.widgetLoc }),
              thuTuLoc: type.thuTuLoc,
              thuTuHienThi: type.thuTuHienThi,
              value: '',
              giaTriSo: null,
            })),
        };
      })
      .filter(Boolean);
  }
}
