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
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class SpecificationsService {
  constructor(
    @InjectRepository(SpecGroup) private readonly groupRepo: Repository<SpecGroup>,
    @InjectRepository(SpecType) private readonly typeRepo: Repository<SpecType>,
    @InjectRepository(CategorySpecGroup) private readonly catGroupRepo: Repository<CategorySpecGroup>,
    @InjectRepository(SpecValue) private readonly valueRepo: Repository<SpecValue>,
    @InjectRepository(Category) private readonly categoryRepo: Repository<Category>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ── Groups ────────────────────────────────────────────────────────────────

  findAllGroups(): Promise<SpecGroup[]> {
    return this.groupRepo.find({ relations: ['types'], order: { tenNhom: 'ASC' } });
  }

  async findOneGroup(id: number): Promise<SpecGroup> {
    const group = await this.groupRepo.findOne({ where: { id }, relations: ['types'] });
    if (!group) throw new NotFoundException('Nhóm thông số không tồn tại');
    return group;
  }

  async createGroup(dto: CreateSpecGroupDto): Promise<SpecGroup> {
    const group = await this.groupRepo.save(this.groupRepo.create(dto));
    this.auditLogsService.log({
      entityType: 'SpecGroup',
      entityId: String(group.id),
      entityLabel: group.tenNhom,
      actionType: 'TaoMoi',
      actionDetail: `Tạo nhóm thông số kỹ thuật "${group.tenNhom}"`,
      after: JSON.stringify({ id: group.id, tenNhom: group.tenNhom }),
    });
    return group;
  }

  async updateGroup(id: number, dto: CreateSpecGroupDto): Promise<SpecGroup> {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Nhóm thông số không tồn tại');
    const before = { tenNhom: group.tenNhom };
    Object.assign(group, dto);
    const updated = await this.groupRepo.save(group);
    this.auditLogsService.log({
      entityType: 'SpecGroup',
      entityId: String(id),
      entityLabel: updated.tenNhom,
      actionType: 'CapNhat',
      actionDetail: `Cập nhật nhóm thông số kỹ thuật "${updated.tenNhom}"`,
      before: JSON.stringify(before),
      after: JSON.stringify({ tenNhom: updated.tenNhom }),
    });
    return updated;
  }

  async removeGroup(id: number): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Nhóm thông số không tồn tại');
    await this.groupRepo.remove(group);
    this.auditLogsService.log({
      entityType: 'SpecGroup',
      entityId: String(id),
      entityLabel: group.tenNhom,
      actionType: 'Xoa',
      actionDetail: `Xóa nhóm thông số kỹ thuật "${group.tenNhom}"`,
      before: JSON.stringify({ id, tenNhom: group.tenNhom }),
    });
  }

  // ── Types ─────────────────────────────────────────────────────────────────

  findAllTypes(nhomThongSoId?: number): Promise<SpecType[]> {
    return this.typeRepo.find({
      where: nhomThongSoId ? { nhomThongSoId } : undefined,
      relations: ['group'],
      order: { thuTuHienThi: 'ASC' },
    });
  }

  async reorderSpecTypes(nhomThongSoId: number, orderedIds: number[]): Promise<void> {
    await Promise.all(
      orderedIds.map((id, idx) => this.typeRepo.update({ id, nhomThongSoId }, { thuTuHienThi: idx })),
    );
    this.auditLogsService.log({
      entityType: 'SpecType',
      entityId: 'batch',
      entityLabel: `Sắp xếp lại loại thông số trong nhóm #${nhomThongSoId}`,
      actionType: 'CapNhat',
      actionDetail: `Sắp xếp lại thứ tự ${orderedIds.length} loại thông số trong nhóm #${nhomThongSoId}`,
      after: JSON.stringify({ nhomThongSoId, newOrder: orderedIds }),
    });
  }

  async createType(dto: CreateSpecTypeDto): Promise<SpecType> {
    if (dto.maKyThuat) {
      const exists = await this.typeRepo.findOne({ where: { maKyThuat: dto.maKyThuat } });
      if (exists) throw new ConflictException(`Mã kỹ thuật "${dto.maKyThuat}" đã tồn tại`);
    }
    const specType = await this.typeRepo.save(this.typeRepo.create(dto));
    this.auditLogsService.log({
      entityType: 'SpecType',
      entityId: String(specType.id),
      entityLabel: specType.tenLoai,
      actionType: 'TaoMoi',
      actionDetail: `Tạo loại thông số "${specType.tenLoai}" trong nhóm #${specType.nhomThongSoId} (kiểu dữ liệu: ${specType.kieuDuLieu})`,
      after: JSON.stringify({ id: specType.id, tenLoai: specType.tenLoai, nhomThongSoId: specType.nhomThongSoId, kieuDuLieu: specType.kieuDuLieu, batBuoc: specType.batBuoc, thuTuHienThi: specType.thuTuHienThi }),
    });
    return specType;
  }

  async updateType(id: number, dto: Partial<CreateSpecTypeDto>): Promise<SpecType> {
    const type = await this.typeRepo.findOne({ where: { id } });
    if (!type) throw new NotFoundException('Loại thông số không tồn tại');
    const before = { tenLoai: type.tenLoai, kieuDuLieu: type.kieuDuLieu, batBuoc: type.batBuoc, donVi: type.donVi };
    Object.assign(type, dto);
    const updated = await this.typeRepo.save(type);
    this.auditLogsService.log({
      entityType: 'SpecType',
      entityId: String(id),
      entityLabel: updated.tenLoai,
      actionType: 'CapNhat',
      actionDetail: `Cập nhật loại thông số "${updated.tenLoai}"`,
      before: JSON.stringify(before),
      after: JSON.stringify({ tenLoai: updated.tenLoai, kieuDuLieu: updated.kieuDuLieu, batBuoc: updated.batBuoc, donVi: updated.donVi }),
    });
    return updated;
  }

  async removeType(id: number): Promise<void> {
    const type = await this.typeRepo.findOne({ where: { id } });
    if (!type) throw new NotFoundException('Loại thông số không tồn tại');
    await this.typeRepo.remove(type);
    this.auditLogsService.log({
      entityType: 'SpecType',
      entityId: String(id),
      entityLabel: type.tenLoai,
      actionType: 'Xoa',
      actionDetail: `Xóa loại thông số "${type.tenLoai}" khỏi nhóm #${type.nhomThongSoId}`,
      before: JSON.stringify({ id, tenLoai: type.tenLoai, nhomThongSoId: type.nhomThongSoId, kieuDuLieu: type.kieuDuLieu }),
    });
  }

  // ── Category ↔ Group links ────────────────────────────────────────────────

  findGroupsByCategory(danhMucId: number): Promise<CategorySpecGroup[]> {
    return this.catGroupRepo.find({ where: { danhMucId }, order: { thuTuHienThi: 'ASC' } });
  }

  /** Upsert: replaces existing link if present, otherwise creates new. */
  async upsertCategoryGroup(dto: LinkCategoryGroupDto): Promise<CategorySpecGroup> {
    const existing = await this.catGroupRepo.findOne({
      where: { danhMucId: dto.danhMucId, nhomThongSoId: dto.nhomThongSoId },
    });
    if (existing) {
      const before = { thuTuHienThi: existing.thuTuHienThi, hienThiBoLoc: existing.hienThiBoLoc, thuTuBoLoc: existing.thuTuBoLoc };
      Object.assign(existing, dto);
      const link = await this.catGroupRepo.save(existing);
      this.auditLogsService.log({
        entityType: 'CategorySpecGroup',
        entityId: String(link.id),
        entityLabel: `Danh mục #${link.danhMucId} ↔ Nhóm spec #${link.nhomThongSoId}`,
        actionType: 'CapNhat',
        actionDetail: `Cập nhật liên kết nhóm thông số #${link.nhomThongSoId} với danh mục #${link.danhMucId}`,
        before: JSON.stringify(before),
        after: JSON.stringify({ thuTuHienThi: link.thuTuHienThi, hienThiBoLoc: link.hienThiBoLoc, thuTuBoLoc: link.thuTuBoLoc }),
      });
      return link;
    }
    const link = await this.catGroupRepo.save(this.catGroupRepo.create(dto));
    this.auditLogsService.log({
      entityType: 'CategorySpecGroup',
      entityId: String(link.id),
      entityLabel: `Danh mục #${link.danhMucId} ↔ Nhóm spec #${link.nhomThongSoId}`,
      actionType: 'TaoMoi',
      actionDetail: `Liên kết nhóm thông số #${link.nhomThongSoId} với danh mục #${link.danhMucId} (thứ tự: ${link.thuTuHienThi})`,
      after: JSON.stringify({ danhMucId: link.danhMucId, nhomThongSoId: link.nhomThongSoId, thuTuHienThi: link.thuTuHienThi, hienThiBoLoc: link.hienThiBoLoc }),
    });
    return link;
  }

  /** Kept for backward compat — throws ConflictException if already linked. */
  async linkCategoryGroup(dto: LinkCategoryGroupDto): Promise<CategorySpecGroup> {
    const exists = await this.catGroupRepo.findOne({
      where: { danhMucId: dto.danhMucId, nhomThongSoId: dto.nhomThongSoId },
    });
    if (exists) throw new ConflictException('Liên kết đã tồn tại');
    return this.catGroupRepo.save(this.catGroupRepo.create(dto));
  }

  async updateCategoryGroup(
    id: number,
    patch: Partial<Pick<CategorySpecGroup, 'hienThiBoLoc' | 'thuTuBoLoc' | 'thuTuHienThi' | 'hanhDong'>>,
  ): Promise<CategorySpecGroup> {
    const link = await this.catGroupRepo.findOne({ where: { id } });
    if (!link) throw new NotFoundException('Liên kết không tồn tại');
    const before = { thuTuHienThi: link.thuTuHienThi, hienThiBoLoc: link.hienThiBoLoc, thuTuBoLoc: link.thuTuBoLoc };
    Object.assign(link, patch);
    const updated = await this.catGroupRepo.save(link);
    this.auditLogsService.log({
      entityType: 'CategorySpecGroup',
      entityId: String(id),
      entityLabel: `Liên kết CategorySpecGroup #${id}`,
      actionType: 'CapNhat',
      actionDetail: `Cập nhật cấu hình nhóm thông số #${id} trong danh mục`,
      before: JSON.stringify(before),
      after: JSON.stringify({ thuTuHienThi: updated.thuTuHienThi, hienThiBoLoc: updated.hienThiBoLoc, thuTuBoLoc: updated.thuTuBoLoc }),
    });
    return updated;
  }

  async unlinkCategoryGroup(id: number): Promise<void> {
    const link = await this.catGroupRepo.findOne({ where: { id } });
    if (!link) throw new NotFoundException('Liên kết không tồn tại');
    await this.catGroupRepo.remove(link);
    this.auditLogsService.log({
      entityType: 'CategorySpecGroup',
      entityId: String(id),
      entityLabel: `CategorySpecGroup #${id}`,
      actionType: 'Xoa',
      actionDetail: `Gỡ liên kết CategorySpecGroup #${id} (danh mục #${link.danhMucId} ↔ nhóm #${link.nhomThongSoId})`,
      before: JSON.stringify({ id, danhMucId: link.danhMucId, nhomThongSoId: link.nhomThongSoId, thuTuHienThi: link.thuTuHienThi }),
    });
  }

  async unlinkCategoryGroupByPair(danhMucId: number, nhomThongSoId: number): Promise<void> {
    const link = await this.catGroupRepo.findOne({ where: { danhMucId, nhomThongSoId } });
    if (!link) throw new NotFoundException('Liên kết không tồn tại');
    await this.catGroupRepo.remove(link);
    this.auditLogsService.log({
      entityType: 'CategorySpecGroup',
      entityId: String(link.id),
      entityLabel: `Danh mục #${danhMucId} ↔ Nhóm spec #${nhomThongSoId}`,
      actionType: 'Xoa',
      actionDetail: `Gỡ liên kết nhóm thông số #${nhomThongSoId} khỏi danh mục #${danhMucId}`,
      before: JSON.stringify({ danhMucId, nhomThongSoId, thuTuHienThi: link.thuTuHienThi }),
    });
  }

  async reorderCategoryGroups(danhMucId: number, orderedGroupIds: number[]): Promise<void> {
    await Promise.all(
      orderedGroupIds.map((nhomThongSoId, idx) =>
        this.catGroupRepo.update({ danhMucId, nhomThongSoId }, { thuTuHienThi: idx }),
      ),
    );
    this.auditLogsService.log({
      entityType: 'CategorySpecGroup',
      entityId: 'batch',
      entityLabel: `Sắp xếp lại nhóm spec của danh mục #${danhMucId}`,
      actionType: 'CapNhat',
      actionDetail: `Sắp xếp lại thứ tự ${orderedGroupIds.length} nhóm thông số trong danh mục #${danhMucId}`,
      after: JSON.stringify({ danhMucId, newOrder: orderedGroupIds }),
    });
  }

  // ── Resolved inheritance view ─────────────────────────────────────────────

  async getResolvedSpecGroupsView(categoryId: number) {
    // Build ancestor path: [rootId, ..., parentId, categoryId]
    const pathIds: number[] = [];
    let cur: number | null = categoryId;
    for (let i = 0; i < 5 && cur != null; i++) {
      pathIds.unshift(cur);
      const cat = await this.categoryRepo.findOne({ where: { id: cur }, select: ['id', 'danhMucChaId'] });
      cur = cat?.danhMucChaId ?? null;
    }

    const allLinks = pathIds.length
      ? await this.catGroupRepo.find({ where: { danhMucId: In(pathIds) } })
      : [];

    // Last-write-wins (root → leaf)
    const resolved = new Map<number, { link: CategorySpecGroup; sourceCategoryId: number }>();
    for (const catId of pathIds) {
      for (const link of allLinks.filter((l) => l.danhMucId === catId)) {
        resolved.set(link.nhomThongSoId, { link, sourceCategoryId: catId });
      }
    }

    if (!resolved.size) return { directIncludes: [], inheritedIncludes: [], directExcludes: [] };

    const groupIds = Array.from(resolved.keys());
    const [groups, sourceCats] = await Promise.all([
      this.groupRepo.find({ where: { id: In(groupIds) }, relations: ['types'] }),
      this.categoryRepo.find({
        where: { id: In([...new Set(Array.from(resolved.values()).map((e) => e.sourceCategoryId))]) },
        select: ['id', 'tenDanhMuc'],
      }),
    ]);
    const groupMap = new Map(groups.map((g) => [g.id, g]));
    const catNameMap = new Map(sourceCats.map((c) => [c.id, c.tenDanhMuc]));
    const directLinkMap = new Map(
      allLinks.filter((l) => l.danhMucId === categoryId).map((l) => [l.nhomThongSoId, l]),
    );

    const directIncludes: object[] = [];
    const inheritedIncludes: object[] = [];
    const directExcludes: object[] = [];

    for (const [groupId, { link, sourceCategoryId }] of resolved) {
      const group = groupMap.get(groupId);
      if (!group) continue;

      const specTypes = (group.types ?? [])
        .sort((a, b) => a.thuTuHienThi - b.thuTuHienThi)
        .map((t) => ({
          id: String(t.id), groupId: String(t.nhomThongSoId), name: t.tenLoai,
          description: t.moTa ?? '', maKyThuat: t.maKyThuat ?? null,
          displayOrder: t.thuTuHienThi, required: t.batBuoc === 'BAT_BUOC',
          kieuDuLieu: t.kieuDuLieu, donVi: t.donVi ?? null, coTheLoc: t.coTheLoc,
          widgetLoc: t.widgetLoc ?? null, thuTuLoc: t.thuTuLoc,
          createdAt: '', updatedAt: '',
        }));

      const baseGroup = {
        id: String(group.id), name: group.tenNhom,
        description: '', displayOrder: link.thuTuHienThi,
        createdAt: '', updatedAt: '',
      };

      if (link.hanhDong === 'loai_tru' && sourceCategoryId === categoryId) {
        // Find where the original include came from
        let originId: number | null = null;
        for (const catId of [...pathIds].reverse()) {
          if (catId === categoryId) continue;
          const a = allLinks.find(
            (l) => l.danhMucId === catId && l.nhomThongSoId === groupId && l.hanhDong !== 'loai_tru',
          );
          if (a) { originId = catId; break; }
        }
        directExcludes.push({
          specGroupId: String(groupId), specGroupName: group.tenNhom,
          sourceCategoryId: originId != null ? String(originId) : '',
          sourceCategoryName: originId != null ? (catNameMap.get(originId) ?? '') : '',
        });
        continue;
      }
      if (link.hanhDong === 'loai_tru') continue; // excluded by ancestor, skip entirely

      const directLink = directLinkMap.get(groupId);
      const isInherited = link.hanhDong === 'ghi_de_thu_tu' ? true : sourceCategoryId !== categoryId;
      const effective = {
        ...baseGroup, isInherited,
        sourceCategoryId: String(sourceCategoryId),
        sourceCategoryName: catNameMap.get(sourceCategoryId) ?? '',
        specTypes,
        assignment: directLink
          ? {
              assignmentType: directLink.hanhDong === 'loai_tru' ? 'exclude'
                : directLink.hanhDong === 'ghi_de_thu_tu' ? 'ghi_de_thu_tu' : 'include',
              displayOrder: directLink.thuTuHienThi,
              hienThiBoLoc: directLink.hienThiBoLoc,
              thuTuBoLoc: directLink.thuTuBoLoc,
            }
          : undefined,
      };

      if (isInherited) inheritedIncludes.push(effective);
      else directIncludes.push(effective);
    }

    (directIncludes as { displayOrder: number }[]).sort((a, b) => a.displayOrder - b.displayOrder);
    (inheritedIncludes as { displayOrder: number }[]).sort((a, b) => a.displayOrder - b.displayOrder);

    return { directIncludes, inheritedIncludes, directExcludes };
  }

  // ── Spec Values (per variant) ─────────────────────────────────────────────

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
      id: String(group.id), label: group.tenNhom, inherited: false,
      items: items.sort((a, b) => a.type.thuTuHienThi - b.type.thuTuHienThi).map(({ value, type }) => ({
        id: String(value.id), typeId: String(type.id), typeLabel: type.tenLoai,
        ...(type.moTa && { description: type.moTa }),
        ...(type.maKyThuat && { maKyThuat: type.maKyThuat }),
        kieuDuLieu: type.kieuDuLieu, ...(type.donVi && { donVi: type.donVi }),
        batBuoc: type.batBuoc === 'BAT_BUOC', coTheLoc: type.coTheLoc,
        ...(type.widgetLoc && { widgetLoc: type.widgetLoc }),
        thuTuLoc: type.thuTuLoc, thuTuHienThi: type.thuTuHienThi,
        value: value.giaTriThongSo, ...(value.giaTriChuan && { giaTriChuan: value.giaTriChuan }),
        giaTriSo: value.giaTriSo,
      })),
    }));
  }

  /** Like getSpecGroupsForVariant but includes all spec types from the category tree,
   *  with empty values for types the variant hasn't filled in yet. */
  async getSpecGroupsForVariantMerged(variantId: number, categoryId: number) {
    const [template, values] = await Promise.all([
      this.getSpecTemplateForCategory(categoryId),
      this.valueRepo.find({ where: { phienBanId: variantId } }),
    ]);

    const valueMap = new Map<number, SpecValue>(values.map((v) => [v.loaiThongSoId, v]));

    return template.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        const actual = valueMap.get(Number(item.typeId));
        if (!actual) return item;
        return {
          ...item,
          id: String(actual.id),
          value: actual.giaTriThongSo,
          ...(actual.giaTriChuan != null && { giaTriChuan: actual.giaTriChuan }),
          giaTriSo: actual.giaTriSo,
        };
      }),
    }));
  }

  findValuesByVariant(phienBanId: number): Promise<SpecValue[]> {
    return this.valueRepo.find({ where: { phienBanId }, order: { loaiThongSoId: 'ASC' } });
  }

  async saveSpecValues(phienBanId: number, dto: SaveSpecValuesDto): Promise<SpecValue[]> {
    const filled = dto.specs.filter((item) => item.giaTriThongSo?.trim());
    await this.valueRepo.delete({ phienBanId });
    if (!filled.length) return [];
    return this.valueRepo.save(filled.map((item) => this.valueRepo.create({ phienBanId, ...item })));
  }

  async getSpecTemplateForCategory(categoryId: number) {
    const categoryIds: number[] = [];
    let cur: number | null = categoryId;
    for (let i = 0; i < 5 && cur != null; i++) {
      categoryIds.push(cur);
      const cat = await this.categoryRepo.findOne({ where: { id: cur }, select: ['id', 'danhMucChaId'] });
      cur = cat?.danhMucChaId ?? null;
    }
    if (!categoryIds.length) return [];

    const links = await this.catGroupRepo.find({ where: { danhMucId: In(categoryIds) } });
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
          id: String(group.id), label: group.tenNhom,
          inherited: link.danhMucId !== categoryId,
          displayOrder: link.thuTuHienThi,
          hienThiBoLoc: link.hienThiBoLoc, thuTuBoLoc: link.thuTuBoLoc,
          items: (group.types ?? [])
            .sort((a, b) => a.thuTuHienThi - b.thuTuHienThi)
            .map((t) => ({
              id: `template-${t.id}`, typeId: String(t.id), typeLabel: t.tenLoai,
              ...(t.moTa && { description: t.moTa }),
              ...(t.maKyThuat && { maKyThuat: t.maKyThuat }),
              kieuDuLieu: t.kieuDuLieu, ...(t.donVi && { donVi: t.donVi }),
              batBuoc: t.batBuoc === 'BAT_BUOC', coTheLoc: t.coTheLoc,
              ...(t.widgetLoc && { widgetLoc: t.widgetLoc }),
              thuTuLoc: t.thuTuLoc, thuTuHienThi: t.thuTuHienThi, value: '', giaTriSo: null,
            })),
        };
      })
      .filter(Boolean);
  }
}
