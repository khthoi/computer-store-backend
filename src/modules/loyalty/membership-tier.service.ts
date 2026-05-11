import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { MembershipTier } from './entities/membership-tier.entity';
import { MembershipTierResponseDto } from './dto/loyalty-response.dto';
import { CreateMembershipTierDto } from './dto/create-membership-tier.dto';
import { UpdateMembershipTierDto } from './dto/update-membership-tier.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const INF = Number.MAX_SAFE_INTEGER;

@Injectable()
export class MembershipTierService {
  constructor(
    @InjectRepository(MembershipTier)
    private readonly tierRepo: Repository<MembershipTier>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ── Public helpers ─────────────────────────────────────────────────────────

  async findAll(
    page = 1,
    limit = 10,
    search?: string,
    activeOnly = false,
  ): Promise<{ data: MembershipTierResponseDto[]; total: number; totalPages: number }> {
    const qb = this.tierRepo.createQueryBuilder('t').orderBy('t.minPoints', 'ASC');

    if (activeOnly) qb.andWhere('t.hoat_dong = :active', { active: true });
    if (search?.trim()) {
      qb.andWhere('LOWER(t.nhan_hien_thi) LIKE :q', {
        q: `%${search.trim().toLowerCase()}%`,
      });
    }

    const total = await qb.getCount();
    const tiers = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const counts = await this.fetchCustomerCounts(tiers.map((t) => t.id));
    return {
      data: tiers.map((t) => this.toDto(t, counts.get(t.id) ?? 0)),
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findById(id: number): Promise<MembershipTierResponseDto> {
    const tier = await this.tierRepo.findOneBy({ id });
    if (!tier) throw new NotFoundException(`Bậc thứ hạng #${id} không tồn tại.`);
    const counts = await this.fetchCustomerCounts([id]);
    return this.toDto(tier, counts.get(id) ?? 0);
  }

  async create(dto: CreateMembershipTierDto): Promise<MembershipTierResponseDto> {
    const displayName = dto.displayName.trim();
    const maxPoints = dto.maxPoints ?? null;

    await this.validateUniqueName(displayName);
    await this.validateOverlap(dto.minPoints, maxPoints);
    if (maxPoints !== null && dto.minPoints >= maxPoints) {
      throw new BadRequestException('Điểm tối đa phải lớn hơn điểm tối thiểu.');
    }

    const tier = this.tierRepo.create({
      name: this.toSlug(displayName),
      displayName,
      minPoints: dto.minPoints,
      maxPoints,
      color: dto.color ?? null,
      description: dto.description ?? null,
      sortOrder: dto.minPoints,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.tierRepo.save(tier);
    this.auditLogsService.log({
      entityType: 'MembershipTier',
      entityId: String(saved.id),
      entityLabel: saved.displayName,
      actionType: 'TaoMoi',
      actionDetail: `Tạo bậc thành viên "${saved.displayName}"`,
      after: JSON.stringify({ name: saved.name, displayName: saved.displayName, minPoints: saved.minPoints, maxPoints: saved.maxPoints, isActive: saved.isActive }),
    });
    return this.toDto(saved, 0);
  }

  async update(id: number, dto: UpdateMembershipTierDto): Promise<MembershipTierResponseDto> {
    const tier = await this.tierRepo.findOneBy({ id });
    if (!tier) throw new NotFoundException(`Bậc thứ hạng #${id} không tồn tại.`);

    const beforeSnapshot = { displayName: tier.displayName, minPoints: tier.minPoints, maxPoints: tier.maxPoints, isActive: tier.isActive };
    const displayName = dto.displayName !== undefined ? dto.displayName.trim() : tier.displayName;
    const minPoints   = dto.minPoints   !== undefined ? dto.minPoints   : tier.minPoints;
    const maxPoints   = dto.maxPoints   !== undefined ? dto.maxPoints ?? null : tier.maxPoints;

    if (dto.displayName !== undefined && displayName !== tier.displayName) {
      await this.validateUniqueName(displayName, id);
    }

    await this.validateOverlap(minPoints, maxPoints, id);

    if (maxPoints !== null && minPoints >= maxPoints) {
      throw new BadRequestException('Điểm tối đa phải lớn hơn điểm tối thiểu.');
    }

    tier.displayName = displayName;
    tier.name        = this.toSlug(displayName);
    tier.minPoints   = minPoints;
    tier.maxPoints   = maxPoints;
    tier.sortOrder   = minPoints;

    if (dto.color       !== undefined) tier.color       = dto.color ?? null;
    if (dto.description !== undefined) tier.description = dto.description ?? null;
    if (dto.isActive    !== undefined) tier.isActive    = dto.isActive;

    const saved = await this.tierRepo.save(tier);
    this.auditLogsService.log({
      entityType: 'MembershipTier',
      entityId: String(id),
      entityLabel: saved.displayName,
      actionType: 'CapNhat',
      actionDetail: `Cập nhật bậc thành viên "${saved.displayName}"`,
      before: JSON.stringify(beforeSnapshot),
      after: JSON.stringify({ displayName: saved.displayName, minPoints: saved.minPoints, maxPoints: saved.maxPoints, isActive: saved.isActive }),
    });
    const counts = await this.fetchCustomerCounts([id]);
    return this.toDto(saved, counts.get(id) ?? 0);
  }

  async remove(id: number): Promise<void> {
    const tier = await this.tierRepo.findOneBy({ id });
    if (!tier) throw new NotFoundException(`Bậc thứ hạng #${id} không tồn tại.`);

    const counts = await this.fetchCustomerCounts([id]);
    const count  = counts.get(id) ?? 0;
    if (count > 0) {
      throw new ConflictException(
        `Bậc '${tier.displayName}' đang có ${count} khách hàng. Vui lòng chuyển họ sang bậc khác trước khi xóa.`,
      );
    }

    await this.tierRepo.delete(id);
    this.auditLogsService.log({
      entityType: 'MembershipTier',
      entityId: String(id),
      entityLabel: tier.displayName,
      actionType: 'Xoa',
      actionDetail: `Xóa bậc thành viên "${tier.displayName}"`,
      before: JSON.stringify({ displayName: tier.displayName, minPoints: tier.minPoints, maxPoints: tier.maxPoints }),
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async validateUniqueName(displayName: string, excludeId?: number): Promise<void> {
    const qb = this.tierRepo
      .createQueryBuilder('t')
      .where('LOWER(t.displayName) = LOWER(:name)', { name: displayName });
    if (excludeId !== undefined) qb.andWhere('t.id <> :id', { id: excludeId });
    const exists = await qb.getExists();
    if (exists) throw new ConflictException(`Tên bậc '${displayName}' đã được sử dụng.`);
  }

  private async validateOverlap(
    minPoints: number,
    maxPoints: number | null,
    excludeId?: number,
  ): Promise<void> {
    const allTiers = await this.tierRepo.find();
    const effectiveMax = maxPoints ?? INF;

    // Only one unlimited tier allowed
    if (maxPoints === null) {
      const others = allTiers.filter((t) => t.maxPoints === null && t.id !== excludeId);
      if (others.length > 0) {
        throw new BadRequestException(
          'Chỉ được phép có một bậc không giới hạn điểm tối đa.',
        );
      }
    }

    for (const existing of allTiers) {
      if (existing.id === excludeId) continue;
      const eMax = existing.maxPoints ?? INF;
      const overlaps = minPoints <= eMax && existing.minPoints <= effectiveMax;
      if (overlaps) {
        const rangeStr = existing.maxPoints !== null
          ? `${existing.minPoints}–${existing.maxPoints}`
          : `${existing.minPoints}–∞`;
        throw new ConflictException(
          `Khoảng điểm bị trùng với bậc '${existing.displayName}' (${rangeStr}). Vui lòng điều chỉnh lại.`,
        );
      }
    }
  }

  private async fetchCustomerCounts(ids: number[]): Promise<Map<number, number>> {
    if (ids.length === 0) return new Map();

    const tiers = await this.tierRepo.findBy({ id: In(ids) });
    const map   = new Map<number, number>();

    for (const tier of tiers) {
      const qb = this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'cnt')
        .from('khach_hang', 'kh')
        .where('kh.diem_hien_tai >= :min', { min: tier.minPoints });

      if (tier.maxPoints !== null) {
        qb.andWhere('kh.diem_hien_tai <= :max', { max: tier.maxPoints });
      }

      const row = await qb.getRawOne<{ cnt: string }>();
      map.set(tier.id, parseInt(row?.cnt ?? '0', 10));
    }

    return map;
  }

  private toSlug(displayName: string): string {
    return displayName
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'd')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .toLowerCase();
  }

  private toDto(tier: MembershipTier, customerCount: number): MembershipTierResponseDto {
    return {
      id: tier.id,
      name: tier.name,
      displayName: tier.displayName,
      minPoints: tier.minPoints,
      maxPoints: tier.maxPoints,
      color: tier.color,
      description: tier.description,
      sortOrder: tier.sortOrder,
      isActive: tier.isActive,
      customerCount,
      createdAt: tier.createdAt,
      updatedAt: tier.updatedAt,
    };
  }
}
