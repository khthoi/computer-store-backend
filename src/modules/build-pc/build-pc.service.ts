import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BuildSlot } from './entities/build-slot.entity';
import { CompatibilityRule } from './entities/compatibility-rule.entity';
import { SavedBuild } from './entities/saved-build.entity';
import { BuildDetail } from './entities/build-detail.entity';
import { CreateSavedBuildDto } from './dto/create-saved-build.dto';
import { CheckCompatibilityDto } from './dto/check-compatibility.dto';

@Injectable()
export class BuildPcService {
  constructor(
    @InjectRepository(BuildSlot) private readonly slotRepo: Repository<BuildSlot>,
    @InjectRepository(CompatibilityRule) private readonly ruleRepo: Repository<CompatibilityRule>,
    @InjectRepository(SavedBuild) private readonly buildRepo: Repository<SavedBuild>,
    @InjectRepository(BuildDetail) private readonly detailRepo: Repository<BuildDetail>,
  ) {}

  // ── Slots ─────────────────────────────────────────────────────────────────

  findAllSlots(): Promise<BuildSlot[]> {
    return this.slotRepo.find({ order: { thuTu: 'ASC' } });
  }

  async createSlot(data: Partial<BuildSlot>): Promise<BuildSlot> {
    return this.slotRepo.save(this.slotRepo.create(data));
  }

  async updateSlot(id: number, data: Partial<BuildSlot>): Promise<BuildSlot> {
    const slot = await this.slotRepo.findOne({ where: { id } });
    if (!slot) throw new NotFoundException('Slot không tồn tại');
    Object.assign(slot, data);
    return this.slotRepo.save(slot);
  }

  async removeSlot(id: number): Promise<void> {
    const slot = await this.slotRepo.findOne({ where: { id } });
    if (!slot) throw new NotFoundException('Slot không tồn tại');
    await this.slotRepo.remove(slot);
  }

  // ── Rules ─────────────────────────────────────────────────────────────────

  findAllRules(): Promise<CompatibilityRule[]> {
    return this.ruleRepo.find({ where: { isActive: true }, order: { thuTu: 'ASC' } });
  }

  async createRule(data: Partial<CompatibilityRule>): Promise<CompatibilityRule> {
    return this.ruleRepo.save(this.ruleRepo.create(data));
  }

  async updateRule(id: number, data: Partial<CompatibilityRule>): Promise<CompatibilityRule> {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Quy tắc không tồn tại');
    Object.assign(rule, data);
    return this.ruleRepo.save(rule);
  }

  async removeRule(id: number): Promise<void> {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Quy tắc không tồn tại');
    rule.isActive = false;
    await this.ruleRepo.save(rule);
  }

  // ── Compatibility check ───────────────────────────────────────────────────

  async checkCompatibility(dto: CheckCompatibilityDto): Promise<{ compatible: boolean; errors: string[] }> {
    // Placeholder: full spec-based engine requires SpecValue lookup
    // Returns compatible = true as stub; real logic reads gia_tri_thong_so per variant
    void dto;
    return { compatible: true, errors: [] };
  }

  // ── Saved Builds ──────────────────────────────────────────────────────────

  async create(dto: CreateSavedBuildDto, khachHangId: number): Promise<SavedBuild> {
    const build = this.buildRepo.create({
      ...dto,
      khachHangId,
      details: dto.details?.map((d) => this.detailRepo.create(d)) ?? [],
    });
    return this.buildRepo.save(build);
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
  }
}
