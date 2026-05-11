import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BuildSlot } from './entities/build-slot.entity';
import { CompatibilityRule } from './entities/compatibility-rule.entity';
import { SavedBuild } from './entities/saved-build.entity';
import { BuildDetail } from './entities/build-detail.entity';
import { SpecType } from '../specifications/entities/spec-type.entity';
import { CategorySpecGroup } from '../specifications/entities/category-spec-group.entity';
import { CreateSavedBuildDto } from './dto/create-saved-build.dto';
import { CheckCompatibilityDto } from './dto/check-compatibility.dto';
import { CreateBuildSlotDto } from './dto/create-build-slot.dto';
import { UpdateBuildSlotDto } from './dto/update-build-slot.dto';
import { BuildSlotResponseDto } from './dto/build-slot-response.dto';
import { CreateCompatibilityRuleDto } from './dto/create-compatibility-rule.dto';
import { UpdateCompatibilityRuleDto } from './dto/update-compatibility-rule.dto';
import { CompatibilityRuleResponseDto } from './dto/compatibility-rule-response.dto';
import { SavedBuildResponseDto, SavedBuildDetailResponseDto } from './dto/saved-build-response.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class BuildPcService {
  constructor(
    @InjectRepository(BuildSlot) private readonly slotRepo: Repository<BuildSlot>,
    @InjectRepository(CompatibilityRule) private readonly ruleRepo: Repository<CompatibilityRule>,
    @InjectRepository(SavedBuild) private readonly buildRepo: Repository<SavedBuild>,
    @InjectRepository(BuildDetail) private readonly detailRepo: Repository<BuildDetail>,
    @InjectRepository(SpecType) private readonly specTypeRepo: Repository<SpecType>,
    @InjectRepository(CategorySpecGroup) private readonly categorySpecGroupRepo: Repository<CategorySpecGroup>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ── Slots ─────────────────────────────────────────────────────────────────

  async findAllSlots(): Promise<BuildSlotResponseDto[]> {
    const slots = await this.slotRepo
      .createQueryBuilder('slot')
      .leftJoinAndSelect('slot.danhMuc', 'dm')
      .orderBy('slot.thuTu', 'ASC')
      .getMany();
    return slots.map(BuildSlotResponseDto.fromEntity);
  }

  async createSlot(dto: CreateBuildSlotDto): Promise<BuildSlotResponseDto> {
    const slot = this.slotRepo.create({
      tenSlot: dto.tenKhe,
      maKhe: dto.maKhe,
      danhMucId: dto.danhMucId,
      soLuongMax: dto.soLuong,
      soLuongMin: 1,
      batBuoc: dto.batBuoc,
      thuTu: dto.thuTu,
      moTa: dto.moTa ?? null,
      isActive: dto.isActive,
    });
    const saved = await this.slotRepo.save(slot);
    const withRelation = await this.slotRepo
      .createQueryBuilder('slot')
      .leftJoinAndSelect('slot.danhMuc', 'dm')
      .where('slot.id = :id', { id: saved.id })
      .getOne();
    this.auditLogsService.log({
      entityType: 'BuildSlot',
      entityId: String(saved.id),
      entityLabel: saved.tenSlot,
      actionType: 'CREATE',
      actionDetail: `Tạo slot Build PC "${saved.tenSlot}" (thứ tự ${saved.thuTu}, bắt buộc: ${saved.batBuoc ? 'có' : 'không'})`,
      after: JSON.stringify({ id: saved.id, tenSlot: saved.tenSlot, thuTu: saved.thuTu, batBuoc: saved.batBuoc }),
    });
    return BuildSlotResponseDto.fromEntity(withRelation!);
  }

  async updateSlot(id: number, dto: UpdateBuildSlotDto): Promise<BuildSlotResponseDto> {
    const slot = await this.slotRepo.findOne({ where: { id } });
    if (!slot) throw new NotFoundException('Slot không tồn tại');
    const before = { tenSlot: slot.tenSlot, thuTu: slot.thuTu, batBuoc: slot.batBuoc };
    if (dto.tenKhe !== undefined) slot.tenSlot = dto.tenKhe;
    if (dto.maKhe !== undefined) slot.maKhe = dto.maKhe;
    if (dto.danhMucId !== undefined) slot.danhMucId = dto.danhMucId;
    if (dto.soLuong !== undefined) slot.soLuongMax = dto.soLuong;
    if (dto.batBuoc !== undefined) slot.batBuoc = dto.batBuoc;
    if (dto.thuTu !== undefined) slot.thuTu = dto.thuTu;
    if (dto.moTa !== undefined) slot.moTa = dto.moTa ?? null;
    if (dto.isActive !== undefined) slot.isActive = dto.isActive;
    await this.slotRepo.save(slot);
    const withRelation = await this.slotRepo
      .createQueryBuilder('slot')
      .leftJoinAndSelect('slot.danhMuc', 'dm')
      .where('slot.id = :id', { id })
      .getOne();
    this.auditLogsService.log({
      entityType: 'BuildSlot',
      entityId: String(id),
      entityLabel: withRelation!.tenSlot,
      actionType: 'UPDATE',
      actionDetail: `Cập nhật slot "${withRelation!.tenSlot}"`,
      before: JSON.stringify(before),
      after: JSON.stringify({ tenSlot: withRelation!.tenSlot, thuTu: withRelation!.thuTu, batBuoc: withRelation!.batBuoc }),
    });
    return BuildSlotResponseDto.fromEntity(withRelation!);
  }

  async removeSlot(id: number): Promise<void> {
    const slot = await this.slotRepo.findOne({ where: { id } });
    if (!slot) throw new NotFoundException('Slot không tồn tại');
    await this.slotRepo.remove(slot);
    this.auditLogsService.log({
      entityType: 'BuildSlot',
      entityId: String(id),
      entityLabel: slot.tenSlot,
      actionType: 'DELETE',
      actionDetail: `Xóa slot Build PC "${slot.tenSlot}"`,
      before: JSON.stringify({ id: slot.id, tenSlot: slot.tenSlot, thuTu: slot.thuTu }),
    });
  }

  async reorderSlots(orderedIds: number[]): Promise<void> {
    await Promise.all(
      orderedIds.map((id, idx) => this.slotRepo.update(id, { thuTu: idx + 1 })),
    );
    this.auditLogsService.log({
      entityType: 'BuildSlot',
      entityId: 'batch',
      entityLabel: 'Reorder slots',
      actionType: 'REORDER',
      actionDetail: `Sắp xếp lại thứ tự ${orderedIds.length} slot Build PC`,
      after: JSON.stringify({ newOrder: orderedIds }),
    });
  }

  // ── Tech keys ─────────────────────────────────────────────────────────────

  async findTechKeys(
    categoryIds?: number[],
  ): Promise<{ value: string; label: string; unit: string | null; groupId: number; groupName: string }[]> {
    const qb = this.specTypeRepo
      .createQueryBuilder('st')
      .innerJoin('st.group', 'sg')
      .select('st.maKyThuat', 'value')
      .addSelect('st.tenLoai', 'label')
      .addSelect('st.donVi', 'unit')
      .addSelect('sg.id', 'groupId')
      .addSelect('sg.tenNhom', 'groupName')
      .where('st.maKyThuat IS NOT NULL');

    if (categoryIds && categoryIds.length > 0) {
      const groupIds = await this.categorySpecGroupRepo
        .createQueryBuilder('csg')
        .select('DISTINCT csg.nhomThongSoId', 'id')
        .where('csg.danhMucId IN (:...categoryIds)', { categoryIds })
        .andWhere("csg.hanhDong != 'loai_tru'")
        .getRawMany<{ id: number }>();

      if (groupIds.length > 0) {
        qb.andWhere('sg.id IN (:...groupIds)', { groupIds: groupIds.map((g) => g.id) });
      }
    }

    qb.orderBy('sg.id', 'ASC')
      .addOrderBy('st.thuTuHienThi', 'ASC')
      .addOrderBy('st.tenLoai', 'ASC');

    const rows = await qb.getRawMany<{ value: string; label: string; unit: string | null; groupId: number; groupName: string }>();

    // deduplicate by value (multiple categories can share the same spec group)
    const seen = new Set<string>();
    return rows.filter((r) => {
      if (seen.has(r.value)) return false;
      seen.add(r.value);
      return true;
    });
  }

  // ── Rules ─────────────────────────────────────────────────────────────────

  async findAllRules(): Promise<CompatibilityRuleResponseDto[]> {
    const rules = await this.ruleRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.slotNguon', 'sn')
      .leftJoinAndSelect('r.slotDich', 'sd')
      .orderBy('r.thuTu', 'ASC')
      .getMany();
    return rules.map(CompatibilityRuleResponseDto.fromEntity);
  }

  async createRule(dto: CreateCompatibilityRuleDto): Promise<CompatibilityRuleResponseDto> {
    const rule = this.ruleRepo.create({
      tenQuyTac: dto.tenQuyTac,
      slotNguonId: dto.slotNguonId,
      maKtNguon: dto.maKyThuat,
      slotDichId: dto.slotDichId ?? null,
      maKtDich: dto.maKyThuat,
      loaiKiemTra: dto.loaiKiemTra,
      heSo: dto.heSo ?? 1.0,
      giaTriMacDinh: dto.giaTriMacDinh ?? null,
      thongBaoLoi: dto.moTa ?? '',
      batBuoc: dto.batBuoc,
      isActive: dto.isActive,
      thuTu: dto.thuTu ?? 0,
    });
    const saved = await this.ruleRepo.save(rule);
    const withRelations = await this.ruleRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.slotNguon', 'sn')
      .leftJoinAndSelect('r.slotDich', 'sd')
      .where('r.id = :id', { id: saved.id })
      .getOne();
    this.auditLogsService.log({
      entityType: 'CompatibilityRule',
      entityId: String(saved.id),
      entityLabel: `Rule: ${withRelations!.slotNguon?.tenSlot} ↔ ${withRelations!.slotDich?.tenSlot}`,
      actionType: 'CREATE',
      actionDetail: `Tạo quy tắc tương thích giữa slot "${withRelations!.slotNguon?.tenSlot}" và "${withRelations!.slotDich?.tenSlot}" (loại: ${saved.loaiKiemTra})`,
      after: JSON.stringify({ id: saved.id, slotNguonId: saved.slotNguonId, slotDichId: saved.slotDichId, loaiKiemTra: saved.loaiKiemTra, thongBaoLoi: saved.thongBaoLoi }),
    });
    return CompatibilityRuleResponseDto.fromEntity(withRelations!);
  }

  async updateRule(id: number, dto: UpdateCompatibilityRuleDto): Promise<CompatibilityRuleResponseDto> {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Quy tắc không tồn tại');
    const before = { loaiKiemTra: rule.loaiKiemTra, thongBaoLoi: rule.thongBaoLoi };
    if (dto.tenQuyTac !== undefined) rule.tenQuyTac = dto.tenQuyTac;
    if (dto.slotNguonId !== undefined) rule.slotNguonId = dto.slotNguonId;
    if (dto.maKyThuat !== undefined) { rule.maKtNguon = dto.maKyThuat; rule.maKtDich = dto.maKyThuat; }
    if (dto.slotDichId !== undefined) rule.slotDichId = dto.slotDichId ?? null;
    if (dto.loaiKiemTra !== undefined) rule.loaiKiemTra = dto.loaiKiemTra;
    if (dto.heSo !== undefined) rule.heSo = dto.heSo;
    if (dto.giaTriMacDinh !== undefined) rule.giaTriMacDinh = dto.giaTriMacDinh ?? null;
    if (dto.moTa !== undefined) rule.thongBaoLoi = dto.moTa ?? '';
    if (dto.batBuoc !== undefined) rule.batBuoc = dto.batBuoc;
    if (dto.isActive !== undefined) rule.isActive = dto.isActive;
    if (dto.thuTu !== undefined) rule.thuTu = dto.thuTu;
    await this.ruleRepo.save(rule);
    const withRelations = await this.ruleRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.slotNguon', 'sn')
      .leftJoinAndSelect('r.slotDich', 'sd')
      .where('r.id = :id', { id })
      .getOne();
    this.auditLogsService.log({
      entityType: 'CompatibilityRule',
      entityId: String(id),
      entityLabel: `Rule #${id}`,
      actionType: 'UPDATE',
      actionDetail: `Cập nhật quy tắc tương thích #${id}`,
      before: JSON.stringify(before),
      after: JSON.stringify({ loaiKiemTra: rule.loaiKiemTra, thongBaoLoi: rule.thongBaoLoi }),
    });
    return CompatibilityRuleResponseDto.fromEntity(withRelations!);
  }

  async removeRule(id: number): Promise<void> {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Quy tắc không tồn tại');
    await this.ruleRepo.remove(rule);
    this.auditLogsService.log({
      entityType: 'CompatibilityRule',
      entityId: String(id),
      entityLabel: `Rule #${id}`,
      actionType: 'DELETE',
      actionDetail: `Xóa quy tắc tương thích #${id} (slot ${rule.slotNguonId} ↔ ${rule.slotDichId})`,
      before: JSON.stringify({ slotNguonId: rule.slotNguonId, slotDichId: rule.slotDichId, loaiKiemTra: rule.loaiKiemTra }),
    });
  }

  // ── Compatibility check ───────────────────────────────────────────────────

  async checkCompatibility(dto: CheckCompatibilityDto): Promise<{ compatible: boolean; errors: string[] }> {
    // Placeholder: full spec-based engine requires SpecValue lookup
    // Returns compatible = true as stub; real logic reads gia_tri_thong_so per variant
    void dto;
    return { compatible: true, errors: [] };
  }

  // ── Admin: Saved Builds ────────────────────────────────────────────────────

  async findAllBuildsAdmin(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    customerId?: number;
  } = {}): Promise<{ data: SavedBuildResponseDto[]; total: number }> {
    const { page = 1, limit = 10, status, search, customerId } = params;
    const qb = this.buildRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.khachHang', 'kh')
      .orderBy('b.ngayCapNhat', 'DESC');

    if (customerId) qb.andWhere('b.khachHangId = :customerId', { customerId });
    if (status) qb.andWhere('b.trangThai = :status', { status });
    if (search) {
      qb.andWhere(
        '(b.tenBuild LIKE :q OR kh.ho_ten LIKE :q OR kh.email LIKE :q)',
        { q: `%${search}%` },
      );
    }

    const [builds, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data: builds.map(SavedBuildResponseDto.fromEntity), total };
  }

  async findBuildDetailAdmin(id: number): Promise<SavedBuildDetailResponseDto> {
    const build = await this.buildRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.khachHang', 'kh')
      .leftJoinAndSelect('b.details', 'd')
      .leftJoinAndSelect('d.slot', 'slot')
      .leftJoinAndSelect('d.phienBan', 'pv')
      .leftJoinAndSelect('pv.product', 'sp')
      .leftJoinAndSelect('pv.images', 'img', "img.loai_anh = 'AnhChinh'")
      .where('b.id = :id', { id })
      .getOne();
    if (!build) throw new NotFoundException('Build không tồn tại');
    return SavedBuildDetailResponseDto.fromEntity(build);
  }

  // ── Saved Builds (customer-facing) ────────────────────────────────────────

  async create(dto: CreateSavedBuildDto, khachHangId: number): Promise<SavedBuild> {
    const build = this.buildRepo.create({
      ...dto,
      khachHangId,
      details: dto.details?.map((d) => this.detailRepo.create(d)) ?? [],
    });
    const savedBuild = await this.buildRepo.save(build);
    this.auditLogsService.log({
      entityType: 'SavedBuild',
      entityId: String(savedBuild.id),
      entityLabel: savedBuild.tenBuild ?? `Build #${savedBuild.id}`,
      actionType: 'CREATE',
      actionDetail: `Khách hàng lưu cấu hình Build PC "${savedBuild.tenBuild ?? ''}" (${savedBuild.details?.length ?? 0} linh kiện)`,
      after: JSON.stringify({ id: savedBuild.id, khachHangId, tenBuild: savedBuild.tenBuild }),
    });
    return savedBuild;
  }

  async findMyBuilds(khachHangId: number): Promise<SavedBuild[]> {
    return this.buildRepo.find({
      where: { khachHangId },
      relations: ['details'],
      order: { ngayCapNhat: 'DESC' },
    });
  }

  async findOne(id: number, khachHangId?: number): Promise<SavedBuild> {
    const build = await this.buildRepo.findOne({ where: { id }, relations: ['details'] });
    if (!build) throw new NotFoundException('Build không tồn tại');
    if (!build.isPublic && build.khachHangId !== khachHangId) {
      throw new ForbiddenException('Không có quyền truy cập');
    }
    return build;
  }

  async remove(id: number, khachHangId: number): Promise<void> {
    const build = await this.buildRepo.findOne({ where: { id } });
    if (!build) throw new NotFoundException('Build không tồn tại');
    if (build.khachHangId !== khachHangId) throw new ForbiddenException('Không có quyền xoá');
    await this.buildRepo.remove(build);
    this.auditLogsService.log({
      entityType: 'SavedBuild',
      entityId: String(id),
      entityLabel: build.tenBuild ?? `Build #${id}`,
      actionType: 'DELETE',
      actionDetail: `Khách hàng xóa cấu hình Build PC "${build.tenBuild ?? ''}"`,
      before: JSON.stringify({ id: build.id, khachHangId, tenBuild: build.tenBuild }),
    });
  }
}
