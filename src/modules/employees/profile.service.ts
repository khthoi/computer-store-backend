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

// ─── Constants ────────────────────────────────────────────────────────────────

const PWD_CONFIRM_TTL = 15 * 60; // 15 minutes in seconds
const PWD_CONFIRM_KEY = (token: string) => `pwd_confirm:${token}`;

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

  // details column is VARCHAR(500)
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
  ) {}

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

    // Snapshot old values before mutating
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

    return this.toEmployeeDto(saved);
  }

  // ─── POST /admin/me/change-password ────────────────────────────────────────
  // Validates current password, stores new password hash in Redis, sends confirmation email.

  async requestPasswordChange(
    employeeId: number,
    dto: ChangePasswordDto,
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

    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        employeeId,
        action: 'profile_edit',
        details: `Yêu cầu đổi mật khẩu — email xác nhận đã gửi đến ${employee.email} (hiệu lực ${PWD_CONFIRM_TTL / 60} phút)`,
        ipAddress: null,
      }),
    );

    return {
      message: `Email xác nhận đã được gửi đến ${employee.email}. Vui lòng kiểm tra hộp thư và nhấn vào đường link để hoàn tất thay đổi mật khẩu (hiệu lực ${PWD_CONFIRM_TTL / 60} phút).`,
    };
  }

  // ─── GET /admin/me/confirm-password-change?token=TOKEN ────────────────────
  // Called when user clicks the email link — confirms and applies the password change.

  async confirmPasswordChange(token: string): Promise<{ employeeEmail: string }> {
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
      select: ['id', 'email'],
    });
    if (!employee) throw new NotFoundException('Nhân viên không tồn tại');

    await Promise.all([
      this.employeeRepo.update(employeeId, { matKhauHash: newPasswordHash }),
      this.redisService.del(PWD_CONFIRM_KEY(token)),
      this.auditLogRepo.save(
        this.auditLogRepo.create({
          employeeId,
          action: 'profile_edit',
          details: 'Đổi mật khẩu thành công qua email xác nhận',
          ipAddress: null,
        }),
      ),
    ]);

    return { employeeEmail: employee.email };
  }

  // ─── POST /admin/me/avatar ─────────────────────────────────────────────────

  async updateAvatar(
    employeeId: number,
    file: Express.Multer.File,
  ): Promise<AvatarResponseDto> {
    const before = await this.employeeRepo.findOne({
      where: { id: employeeId },
      select: ['id', 'anhDaiDien'],
    });

    const asset = await this.mediaService.upload(file, employeeId);
    await this.employeeRepo.update(employeeId, {
      anhDaiDien: asset.urlGoc,
      assetIdAvatar: asset.id,
    });

    const action = before?.anhDaiDien ? 'Cập nhật ảnh đại diện' : 'Thêm ảnh đại diện';
    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        employeeId,
        action: 'profile_edit',
        details: `${action} — file: "${file.originalname}" (${(file.size / 1024).toFixed(0)} KB)`,
        ipAddress: null,
      }),
    );

    return { avatarUrl: asset.urlGoc };
  }

  // ─── GET /admin/me/audit-logs ──────────────────────────────────────────────

  async getAuditLogs(employeeId: number, page = 1, limit = 20) {
    const [logs, total] = await this.auditLogRepo.findAndCount({
      where: { employeeId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: logs.map((l) => this.toAuditLogDto(l)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Called by AuthService on login ────────────────────────────────────────

  async recordLogin(employeeId: number, ipAddress?: string): Promise<void> {
    await Promise.all([
      this.employeeRepo.update(employeeId, { dangNhapCuoi: new Date() }),
      this.auditLogRepo.save(
        this.auditLogRepo.create({
          employeeId,
          action: 'login',
          details: 'Đăng nhập thành công',
          ipAddress: ipAddress ?? null,
        }),
      ),
    ]);
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
