import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { ClsService } from 'nestjs-cls';
import { Employee } from './entities/employee.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Role } from '../roles/entities/role.entity';
import { MediaService } from '../media/media.service';
import { MailService } from '../mail/mail.service';
import { RedisService } from '../../common/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  ProfileDataDto,
  NhanVienProfileDto,
  VaiTroProfileDto,
  AuditLogEntryDto,
  AvatarResponseDto,
} from './dto/profile-response.dto';
import { truncate500, parseUserAgent, detailUpdate } from '../../common/helpers/log.helper';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction, EntityType } from '../audit-logs/audit-log.constants';

// ─── Constants ────────────────────────────────────────────────────────────────

const PWD_CONFIRM_TTL = 15 * 60; // 15 minutes in seconds
const PWD_CONFIRM_KEY = (token: string) => `pwd_confirm:${token}`;

const STATUS_DISPLAY: Record<string, string> = { DangLam: 'Đang làm', NghiViec: 'Nghỉ việc' };

// ─── Gender mapping helpers ───────────────────────────────────────────────────

function genderToFrontend(db: string | null): 'male' | 'female' | 'other' | null {
  if (db === 'Male') return 'male';
  if (db === 'Female') return 'female';
  if (db === 'Undefined') return 'other';
  return null;
}

function genderToDb(fe: 'male' | 'female' | 'other' | null | undefined): string | null {
  if (fe === 'male') return 'Male';
  if (fe === 'female') return 'Female';
  if (fe === 'other') return 'Undefined';
  return null;
}

function statusToFrontend(db: string): 'active' | 'inactive' | 'suspended' {
  if (db === 'DangLam') return 'active';
  if (db === 'NghiViec') return 'inactive';
  return 'inactive';
}

// TypeORM 'date' columns come back as strings ("YYYY-MM-DD"), not Date objects
function toDateString(val: Date | string | null | undefined): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val.split('T')[0];
  return (val as Date).toISOString().split('T')[0];
}

function labelGender(g: 'male' | 'female' | 'other' | null): string {
  if (g === 'male') return 'Nam';
  if (g === 'female') return 'Nữ';
  if (g === 'other') return 'Khác';
  return '(chưa cung cấp)';
}

// Builds a human-readable diff string for profile_edit audit log entries.
function buildProfileEditDetails(o: {
  oldFullName: string;
  newFullName: string;
  oldPhone: string;
  newPhone: string;
  oldGender: 'male' | 'female' | 'other' | null;
  newGender: 'male' | 'female' | 'other' | null;
  oldDob: string | null;
  newDob: string | null;
}): string {
  const parts: string[] = [];

  if (o.oldFullName !== o.newFullName) {
    parts.push(`Họ tên: "${o.oldFullName}" → "${o.newFullName}"`);
  }

  if (o.oldPhone !== o.newPhone) {
    if (!o.oldPhone) parts.push(`Thêm số điện thoại: "${o.newPhone}"`);
    else if (!o.newPhone) parts.push(`Xoá số điện thoại (trước: "${o.oldPhone}")`);
    else parts.push(`Số điện thoại: "${o.oldPhone}" → "${o.newPhone}"`);
  }

  if (o.oldGender !== o.newGender) {
    parts.push(`Giới tính: ${labelGender(o.oldGender)} → ${labelGender(o.newGender)}`);
  }

  if (o.oldDob !== o.newDob) {
    if (!o.oldDob) parts.push(`Thêm ngày sinh: ${o.newDob}`);
    else if (!o.newDob) parts.push(`Xoá ngày sinh (trước: ${o.oldDob})`);
    else parts.push(`Ngày sinh: ${o.oldDob} → ${o.newDob}`);
  }

  const result = parts.length > 0
    ? `Cập nhật hồ sơ — ${parts.join('; ')}`
    : 'Cập nhật hồ sơ — không có thay đổi';

  return result.length > 500 ? result.slice(0, 497) + '...' : result;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly mediaService: MediaService,
    private readonly mailService: MailService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
    private readonly cls: ClsService,
  ) {}

  private buildActorSuffix(): string {
    const name = this.cls.get<string>('actorName');
    if (!name) return 'hệ thống';
    const code = this.cls.get<string | null>('actorCode');
    const rawRole = this.cls.get<string>('actorRole') ?? '[]';
    let roles: string[] = [];
    try {
      const parsed = JSON.parse(rawRole);
      roles = Array.isArray(parsed) ? (parsed as string[]) : [String(parsed)];
    } catch {
      roles = rawRole ? [rawRole] : [];
    }
    let suffix = `[${name}]`;
    if (code) suffix += ` - [${code}]`;
    if (roles.length) suffix += ` - {[${roles.join('], [')}]}`;
    return suffix;
  }

  // ─── GET /admin/me ─────────────────────────────────────────────────────────

  async getMe(employeeId: number): Promise<ProfileDataDto> {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
      relations: ['roles', 'roles.permissions'],
    });
    if (!employee) throw new NotFoundException('Nhân viên không tồn tại');

    const [auditLogs, roleCounts] = await Promise.all([
      this.auditLogRepo.find({
        where: { employeeId },
        order: { createdAt: 'DESC' },
        take: 50,
      }),
      this.getRoleCounts(employee.roles.map((r) => r.id)),
    ]);

    return {
      employee: this.toEmployeeDto(employee),
      roles: employee.roles.map((r) => this.toRoleDto(r, roleCounts[r.id] ?? 0)),
      auditLogs: auditLogs.map((l) => this.toAuditLogDto(l)),
    };
  }

  // ─── PATCH /admin/me ───────────────────────────────────────────────────────

  async updateMe(
    employeeId: number,
    dto: UpdateMeDto,
    ipAddress?: string,
  ): Promise<NhanVienProfileDto> {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
      relations: ['roles'],
    });
    if (!employee) throw new NotFoundException('Nhân viên không tồn tại');

    const oldFullName = employee.hoTen;
    const oldPhone = employee.soDienThoai ?? '';
    const oldGender = genderToFrontend(employee.gioiTinh);
    const oldDob = toDateString(employee.ngaySinh);

    employee.hoTen = dto.fullName;
    if (dto.phone !== undefined) employee.soDienThoai = dto.phone || null;
    if (dto.gender !== undefined) employee.gioiTinh = genderToDb(dto.gender);
    if (dto.dateOfBirth !== undefined) {
      employee.ngaySinh = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    }

    const saved = await this.employeeRepo.save(employee);

    const details = buildProfileEditDetails({
      oldFullName,
      newFullName: dto.fullName,
      oldPhone,
      newPhone: dto.phone !== undefined ? (dto.phone ?? '') : oldPhone,
      oldGender,
      newGender: dto.gender !== undefined ? (dto.gender ?? null) : oldGender,
      oldDob,
      newDob: dto.dateOfBirth !== undefined ? (dto.dateOfBirth ?? null) : oldDob,
    });

    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        employeeId,
        action: 'profile_edit',
        details,
        ipAddress: ipAddress ?? null,
      }),
    );

    const newGenderLabel = labelGender(genderToFrontend(saved.gioiTinh));
    const newDob = toDateString(saved.ngaySinh);
    this.auditLogsService.log({
      entityType: EntityType.EMPLOYEE,
      entityId: String(employeeId),
      entityLabel: saved.hoTen,
      actionType: AuditAction.UPDATE,
      actionDetail: detailUpdate(
        `hồ sơ ${saved.hoTen}`,
        { hoTen: oldFullName, soDienThoai: oldPhone, gioiTinh: labelGender(oldGender), ngaySinh: oldDob },
        { hoTen: saved.hoTen, soDienThoai: saved.soDienThoai ?? '', gioiTinh: newGenderLabel, ngaySinh: newDob },
        { hoTen: 'Họ tên', soDienThoai: 'Số điện thoại', gioiTinh: 'Giới tính', ngaySinh: 'Ngày sinh' },
      ),
      before: JSON.stringify({ hoTen: oldFullName, soDienThoai: oldPhone, gioiTinh: oldGender, ngaySinh: oldDob }),
      after: JSON.stringify({ hoTen: saved.hoTen, soDienThoai: saved.soDienThoai ?? '', gioiTinh: genderToFrontend(saved.gioiTinh), ngaySinh: newDob }),
    });

    return this.toEmployeeDto(saved);
  }

  // ─── POST /admin/me/change-password ────────────────────────────────────────

  async requestPasswordChange(
    employeeId: number,
    dto: ChangePasswordDto,
    ipAddress?: string,
  ): Promise<{ message: string }> {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
      select: ['id', 'email', 'hoTen', 'matKhauHash'],
    });
    if (!employee) throw new NotFoundException('Nhân viên không tồn tại');

    const ok = await bcrypt.compare(dto.currentPassword, employee.matKhauHash);
    if (!ok) throw new UnauthorizedException('Mật khẩu hiện tại không đúng');

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);
    const token = randomBytes(32).toString('hex');
    const payload = JSON.stringify({ employeeId, newPasswordHash });

    await this.redisService.set(PWD_CONFIRM_KEY(token), payload, PWD_CONFIRM_TTL);

    const backendUrl = this.configService.get<string>('APP_URL', 'http://localhost:4000');
    const confirmLink = `${backendUrl}/api/admin/me/confirm-password-change?token=${token}`;

    await this.mailService.sendPasswordChangeConfirmation({
      to: employee.email,
      fullName: employee.hoTen,
      confirmLink,
      expiresMinutes: PWD_CONFIRM_TTL / 60,
    });

    const ipSuffix = ipAddress ? ` — IP: ${ipAddress}` : '';
    const pwdRequestDetail = truncate500(`Yêu cầu đổi mật khẩu — email xác nhận gửi đến ${employee.email} (hiệu lực ${PWD_CONFIRM_TTL / 60} phút)${ipSuffix}`);
    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        employeeId,
        action: 'password_requested',
        details: pwdRequestDetail,
        ipAddress: ipAddress ?? null,
      }),
    );

    this.auditLogsService.log({
      entityType: EntityType.EMPLOYEE,
      entityId: String(employeeId),
      entityLabel: employee.hoTen,
      actionType: AuditAction.REQUEST_PASSWORD_CHANGE,
      actionDetail: pwdRequestDetail,
    });

    return {
      message: `Email xác nhận đã được gửi đến ${employee.email}. Vui lòng kiểm tra hộp thư và nhấn vào đường link để hoàn tất thay đổi mật khẩu (hiệu lực ${PWD_CONFIRM_TTL / 60} phút).`,
    };
  }

  // ─── GET /admin/me/confirm-password-change?token=TOKEN ────────────────────

  async confirmPasswordChange(token: string, ipAddress?: string): Promise<{ employeeEmail: string }> {
    if (!token) throw new BadRequestException('Token không hợp lệ');

    const raw = await this.redisService.get(PWD_CONFIRM_KEY(token));
    if (!raw) {
      throw new BadRequestException('Đường link xác nhận không hợp lệ hoặc đã hết hiệu lực');
    }

    const { employeeId, newPasswordHash } = JSON.parse(raw) as {
      employeeId: number;
      newPasswordHash: string;
    };

    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
      select: ['id', 'email', 'hoTen', 'maNhanVien'],
    });
    if (!employee) throw new NotFoundException('Nhân viên không tồn tại');

    const changedAt = new Date().toISOString();
    await Promise.all([
      this.employeeRepo.update(employeeId, { matKhauHash: newPasswordHash }),
      this.redisService.del(PWD_CONFIRM_KEY(token)),
      this.auditLogRepo.save(
        this.auditLogRepo.create({
          employeeId,
          action: 'password_changed',
          details: `Đổi mật khẩu thành công qua email xác nhận${ipAddress ? ` — IP: ${ipAddress}` : ''}`,
          ipAddress: ipAddress ?? null,
        }),
      ),
    ]);

    this.auditLogsService.log({
      entityType: EntityType.EMPLOYEE,
      entityId: String(employeeId),
      entityLabel: employee.hoTen,
      actionType: AuditAction.UPDATE,
      actionDetail: `Đổi mật khẩu thành công (xác nhận qua email)`,
      before: JSON.stringify({ matKhau: '[đã hash]' }),
      after: JSON.stringify({ matKhau: '[đã cập nhật]', thoiGian: changedAt }),
    });

    return { employeeEmail: employee.email };
  }

  // ─── POST /admin/me/avatar ─────────────────────────────────────────────────

  async updateAvatar(
    employeeId: number,
    file: Express.Multer.File,
    ipAddress?: string,
  ): Promise<AvatarResponseDto> {
    const before = await this.employeeRepo.findOne({
      where: { id: employeeId },
      select: ['id', 'anhDaiDien', 'maNhanVien', 'hoTen'],
    });

    const asset = await this.mediaService.upload(file, employeeId);
    await this.employeeRepo.update(employeeId, {
      anhDaiDien: asset.urlGoc,
      assetIdAvatar: asset.id,
    });

    const action = before?.anhDaiDien ? 'Cập nhật' : 'Thêm mới';
    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        employeeId,
        action: 'avatar_changed',
        details: truncate500(`${action} ảnh đại diện — ${file.originalname} (${(file.size / 1024).toFixed(0)} KB)`),
        ipAddress: ipAddress ?? null,
      }),
    );

    this.auditLogsService.log({
      entityType: 'NhanVien',
      entityId: String(employeeId),
      entityLabel: before?.hoTen ?? String(employeeId),
      actionType: 'CapNhat',
      actionDetail: `${action} ảnh đại diện — ${file.originalname}`,
      before: JSON.stringify({ anhDaiDien: before?.anhDaiDien ?? null }),
      after: JSON.stringify({ anhDaiDien: asset.urlGoc }),
    });

    return { avatarUrl: asset.urlGoc };
  }

  // ─── GET /admin/me/audit-logs ──────────────────────────────────────────────

  async getAuditLogs(employeeId: number, page = 1, limit = 20, q?: string, action?: string) {
    const qb = this.auditLogRepo
      .createQueryBuilder('l')
      .where('l.employeeId = :employeeId', { employeeId })
      .orderBy('l.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (q?.trim()) {
      qb.andWhere('l.details LIKE :q', { q: `%${q.trim()}%` });
    }
    if (action?.trim()) {
      const actions = action.split(',').map((a) => a.trim()).filter(Boolean);
      if (actions.length > 0) qb.andWhere('l.action IN (:...actions)', { actions });
    }

    const [logs, total] = await qb.getManyAndCount();
    return { items: logs.map((l) => this.toAuditLogDto(l)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Called by AuthService on login ────────────────────────────────────────

  async recordLogin(employeeId: number, ipAddress?: string, userAgent?: string): Promise<void> {
    const uaPart = userAgent ? `, ${parseUserAgent(userAgent)}` : '';
    const details = truncate500(`Đăng nhập thành công — IP: ${ipAddress ?? '(không rõ)'}${uaPart}`);
    await Promise.all([
      this.employeeRepo.update(employeeId, { dangNhapCuoi: new Date() }),
      this.auditLogRepo.save(
        this.auditLogRepo.create({
          employeeId,
          action: 'login_success',
          details,
          ipAddress: ipAddress ?? null,
        }),
      ),
    ]);
  }

  async recordLoginFailed(employeeId: number, ipAddress?: string, reason = 'Sai mật khẩu'): Promise<void> {
    const details = truncate500(`Đăng nhập thất bại — Lý do: ${reason}${ipAddress ? ` — IP: ${ipAddress}` : ''}`);
    try {
      await this.auditLogRepo.save(
        this.auditLogRepo.create({
          employeeId,
          action: 'login_failed',
          details,
          ipAddress: ipAddress ?? null,
        }),
      );
    } catch {}
  }

  async recordLogout(employeeId: number, ipAddress?: string): Promise<void> {
    try {
      await this.auditLogRepo.save(
        this.auditLogRepo.create({
          employeeId,
          action: 'logout',
          details: `Đăng xuất${ipAddress ? ` — IP: ${ipAddress}` : ''}`,
          ipAddress: ipAddress ?? null,
        }),
      );
    } catch {}
  }

  async recordRoleChanged(employeeId: number, oldRoleNames: string[], newRoleNames: string[]): Promise<void> {
    const oldLabel = oldRoleNames.length ? oldRoleNames.join(', ') : '(chưa có)';
    const newLabel = newRoleNames.length ? newRoleNames.join(', ') : '(chưa có)';
    try {
      await this.auditLogRepo.save(
        this.auditLogRepo.create({
          employeeId,
          action: 'role_changed',
          details: truncate500(`Vai trò cập nhật bởi ${this.buildActorSuffix()} — Trước: ${oldLabel}; Sau: ${newLabel}`),
          ipAddress: null,
        }),
      );
    } catch {}
  }

  async recordStatusChanged(employeeId: number, oldStatus: string, newStatus: string): Promise<void> {
    const oldLabel = STATUS_DISPLAY[oldStatus] ?? oldStatus;
    const newLabel = STATUS_DISPLAY[newStatus] ?? newStatus;
    try {
      await this.auditLogRepo.save(
        this.auditLogRepo.create({
          employeeId,
          action: 'status_changed',
          details: truncate500(`Trạng thái cập nhật bởi ${this.buildActorSuffix()} — ${oldLabel} → ${newLabel}`),
          ipAddress: null,
        }),
      );
    } catch {}
  }

  // ─── Mappers ───────────────────────────────────────────────────────────────

  private toEmployeeDto(e: Employee): NhanVienProfileDto {
    const hireDate = toDateString(e.ngayVaoLam) ?? toDateString(e.ngayTao)!;

    return {
      id: String(e.id),
      code: e.maNhanVien,
      fullName: e.hoTen,
      email: e.email,
      phone: e.soDienThoai ?? '',
      avatarUrl: e.anhDaiDien,
      gender: genderToFrontend(e.gioiTinh),
      dateOfBirth: toDateString(e.ngaySinh),
      roleIds: (e.roles ?? []).map((r) => String(r.id)),
      roleNames: (e.roles ?? []).map((r) => r.tenVaiTro),
      status: statusToFrontend(e.trangThai),
      hireDate,
      lastLoginAt: e.dangNhapCuoi ? (e.dangNhapCuoi as Date).toISOString() : null,
      createdAt: (e.ngayTao as Date).toISOString(),
    };
  }

  private toRoleDto(r: Role, employeeCount: number): VaiTroProfileDto {
    return {
      id: String(r.id),
      name: r.tenVaiTro,
      description: r.moTa ?? '',
      permissions: (r.permissions ?? []).map((p) => p.maQuyen),
      employeeCount,
      assignments: [],
      createdAt: '',
    };
  }

  private toAuditLogDto(l: AuditLog): AuditLogEntryDto {
    return {
      id: String(l.id),
      action: l.action,
      details: l.details ?? '',
      ipAddress: l.ipAddress ?? '',
      createdAt: (l.createdAt as Date).toISOString(),
    };
  }

  private async getRoleCounts(roleIds: number[]): Promise<Record<number, number>> {
    if (roleIds.length === 0) return {};
    const rows = await this.employeeRepo
      .createQueryBuilder('e')
      .innerJoin('e.roles', 'r')
      .select('r.id', 'roleId')
      .addSelect('COUNT(e.id)', 'cnt')
      .where('r.id IN (:...ids)', { ids: roleIds })
      .groupBy('r.id')
      .getRawMany<{ roleId: number; cnt: string }>();
    return Object.fromEntries(rows.map((row) => [row.roleId, parseInt(row.cnt, 10)]));
  }
}
