import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RedisService } from '../../common/redis/redis.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const PERMISSIONS_CACHE_KEY = 'cache:permissions:all';
const PERMISSIONS_CACHE_TTL = 600; // 10 phút
const ROLE_PERM_TTL = 600;

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission) private readonly permRepo: Repository<Permission>,
    private readonly redisService: RedisService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAllRoles(dto: QueryRoleDto = {}): Promise<{
    data: (Role & { employeeCount: number })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { q, page = 1, limit = 10, sortBy = 'id', sortOrder = 'ASC' } = dto;

    const allowedSortBy: Record<string, string> = {
      id:            'r.id',
      name:          'r.tenVaiTro',
      createdAt:     'r.createdAt',
    };

    const qb = this.roleRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.permissions', 'p')
      .addSelect(
        `(SELECT COUNT(*) FROM nhan_vien_vai_tro nvvt WHERE nvvt.vai_tro_id = r.vai_tro_id)`,
        'r_employeeCount',
      );

    if (q) {
      qb.where('(r.tenVaiTro LIKE :q OR r.moTa LIKE :q)', { q: `%${q}%` });
    }

    if (sortBy === 'employeeCount') {
      qb.orderBy('r_employeeCount', sortOrder);
    } else {
      qb.orderBy(allowedSortBy[sortBy] ?? 'r.id', sortOrder);
    }

    // Separate count query (avoids join row multiplication issues with getCount)
    const countQb = this.roleRepo.createQueryBuilder('r');
    if (q) countQb.where('(r.tenVaiTro LIKE :q OR r.moTa LIKE :q)', { q: `%${q}%` });
    const total = await countQb.getCount();

    qb.skip((page - 1) * limit).take(limit);

    const { entities, raw } = await qb.getRawAndEntities();

    // leftJoinAndSelect produces one raw row per permission — map by role ID, not index
    const countByRoleId = new Map<number, number>();
    for (const row of raw) {
      const roleId = Number(row.r_vai_tro_id);
      if (!countByRoleId.has(roleId)) {
        countByRoleId.set(roleId, Number(row.r_employeeCount ?? 0));
      }
    }

    return {
      data: entities.map((role) => ({
        ...role,
        employeeCount: countByRoleId.get(role.id) ?? 0,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { id }, relations: ['permissions'] });
    if (!role) throw new NotFoundException(`Vai trò #${id} không tồn tại`);
    return role;
  }

  async findByName(tenVaiTro: string): Promise<Role | null> {
    return this.roleRepo.findOne({ where: { tenVaiTro }, relations: ['permissions'] });
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.roleRepo.findOne({ where: { tenVaiTro: dto.tenVaiTro } });
    if (existing) throw new ConflictException(`Vai trò "${dto.tenVaiTro}" đã tồn tại`);
    const role = this.roleRepo.create({ tenVaiTro: dto.tenVaiTro, moTa: dto.moTa ?? null });
    const saved = await this.roleRepo.save(role);
    this.auditLogsService.log({
      entityType: 'VaiTro',
      entityId: String(saved.id),
      entityLabel: saved.tenVaiTro,
      actionType: 'TaoMoi',
      actionDetail: `Tạo vai trò "${saved.tenVaiTro}"`,
      after: JSON.stringify({ id: saved.id, tenVaiTro: saved.tenVaiTro, moTa: saved.moTa }),
    });
    return saved;
  }

  async update(id: number, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);
    if (role.isSystem) {
      throw new BadRequestException('Không thể chỉnh sửa vai trò hệ thống');
    }
    if (dto.tenVaiTro && dto.tenVaiTro !== role.tenVaiTro) {
      const existing = await this.roleRepo.findOne({ where: { tenVaiTro: dto.tenVaiTro } });
      if (existing) throw new ConflictException(`Vai trò "${dto.tenVaiTro}" đã tồn tại`);
    }
    const before = { tenVaiTro: role.tenVaiTro, moTa: role.moTa };
    Object.assign(role, dto);
    const saved = await this.roleRepo.save(role);
    this.auditLogsService.log({
      entityType: 'VaiTro',
      entityId: String(id),
      entityLabel: saved.tenVaiTro,
      actionType: 'CapNhat',
      actionDetail: `Cập nhật vai trò "${saved.tenVaiTro}"`,
      before: JSON.stringify(before),
      after: JSON.stringify({ tenVaiTro: saved.tenVaiTro, moTa: saved.moTa }),
    });
    return saved;
  }

  async remove(id: number): Promise<void> {
    const role = await this.findOne(id);
    if (role.isSystem) {
      throw new BadRequestException('Không thể xóa vai trò hệ thống');
    }
    // Kiểm tra còn nhân viên đang giữ vai trò này không (query ngược)
    const count = await this.roleRepo
      .createQueryBuilder('r')
      .innerJoin('nhan_vien_vai_tro', 'nvvt', 'nvvt.vai_tro_id = r.vai_tro_id')
      .where('r.vai_tro_id = :id', { id })
      .getCount();
    if (count > 0) throw new BadRequestException('Không thể xoá vai trò đang được gán cho nhân viên');
    await this.roleRepo.remove(role);
    this.auditLogsService.log({
      entityType: 'VaiTro',
      entityId: String(id),
      entityLabel: role.tenVaiTro,
      actionType: 'Xoa',
      actionDetail: `Xóa vai trò "${role.tenVaiTro}"`,
      before: JSON.stringify({ id, tenVaiTro: role.tenVaiTro, moTa: role.moTa }),
    });
  }

  async assignPermissions(roleId: number, permissionIds: number[]): Promise<Role> {
    const role = await this.findOne(roleId);
    if (role.isSystem) {
      throw new BadRequestException('Không thể chỉnh sửa quyền của vai trò hệ thống');
    }
    const beforePermissions = role.permissions?.map((p) => ({ id: p.id, module: p.module, hanhDong: p.hanhDong })) ?? [];
    const permissions = await this.permRepo.findBy({ id: In(permissionIds) });
    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('Một số permission ID không hợp lệ');
    }
    role.permissions = permissions;
    const saved = await this.roleRepo.save(role);
    await this.redisService.invalidate(`role:permissions:${role.tenVaiTro}`);
    await this.redisService.invalidate(PERMISSIONS_CACHE_KEY);
    this.auditLogsService.log({
      entityType: 'VaiTro',
      entityId: String(roleId),
      entityLabel: role.tenVaiTro,
      actionType: 'CapNhat',
      actionDetail: `Cập nhật quyền hạn cho vai trò "${role.tenVaiTro}" (${permissions.length} quyền)`,
      before: JSON.stringify({ permissions: beforePermissions }),
      after: JSON.stringify({ permissions: permissions.map((p) => ({ id: p.id, module: p.module, hanhDong: p.hanhDong })) }),
    });
    return saved;
  }

  async findAllPermissions(): Promise<Permission[]> {
    return this.redisService.cache(PERMISSIONS_CACHE_KEY, PERMISSIONS_CACHE_TTL, () =>
      this.permRepo.find({ order: { module: 'ASC', hanhDong: 'ASC' } }),
    );
  }

  async findPermissionsByIds(ids: number[]): Promise<Permission[]> {
    return this.permRepo.findBy({ id: In(ids) });
  }

  async getRolesByNames(names: string[]): Promise<Role[]> {
    return this.roleRepo.find({ where: { tenVaiTro: In(names) }, relations: ['permissions'] });
  }

  /**
   * Resolve the deduped permission codes granted to a set of role names.
   * Uses per-role Redis cache `role:permissions:<name>` (TTL 10min) — same key
   * the PermissionGuard reads, so guard checks and frontend gating never drift.
   */
  async getPermissionsForRoles(roleNames: string[]): Promise<string[]> {
    if (!roleNames || roleNames.length === 0) return [];
    const permSet = new Set<string>();
    for (const roleName of roleNames) {
      const perms = await this.redisService.cache<string[]>(
        `role:permissions:${roleName}`,
        ROLE_PERM_TTL,
        async () => {
          const role = await this.findByName(roleName);
          return role?.permissions?.map((p) => p.maQuyen) ?? [];
        },
      );
      perms.forEach((p) => permSet.add(p));
    }
    return Array.from(permSet);
  }
}
