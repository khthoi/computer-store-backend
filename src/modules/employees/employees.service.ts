import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Employee } from './entities/employee.entity';
import { Role } from '../roles/entities/role.entity';
import { AuditLog } from './entities/audit-log.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryEmployeesDto } from './dto/query-employees.dto';
import { EmployeeResponseDto, EmployeeListResponseDto } from './dto/employee-response.dto';
import { ClsService } from 'nestjs-cls';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction, EntityType } from '../audit-logs/audit-log.constants';
import { detailCreate, detailUpdate, detailStatusChange, truncate500 } from '../../common/helpers/log.helper';
import { ProfileService } from './profile.service';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';

// MySQL date columns may come back as strings ("YYYY-MM-DD") or Date objects
function toDateString(val: Date | string): string {
  if (typeof val === 'string') return val.slice(0, 10);
  return val.toISOString().split('T')[0];
}
function toDateTimeString(val: Date | string): string {
  if (typeof val === 'string') return new Date(val).toISOString();
  return val.toISOString();
}

const GENDER_MAP: Record<string, 'male' | 'female' | 'other'> = {
  Male: 'male', Female: 'female', Undefined: 'other',
};
const GENDER_TO_DB: Record<string, string> = {
  male: 'Male', female: 'Female', other: 'Undefined',
};
const GENDER_DISPLAY: Record<string, string> = {
  Male: 'Nam', Female: 'Nữ', Undefined: 'Khác',
};
const STATUS_MAP: Record<string, 'active' | 'inactive'> = {
  DangLam: 'active', NghiViec: 'inactive',
};
const STATUS_TO_DB: Record<string, string> = {
  active: 'DangLam', inactive: 'NghiViec',
};
const STATUS_DISPLAY: Record<string, string> = {
  DangLam: 'Đang làm', NghiViec: 'Nghỉ việc',
};

const EMP_FIELD_LABELS: Record<string, string> = {
  fullName: 'Họ tên',
  phone: 'Số điện thoại',
  gender: 'Giới tính',
  dateOfBirth: 'Ngày sinh',
  hireDate: 'Ngày vào làm',
};

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    private readonly auditLogsService: AuditLogsService,
    private readonly profileService: ProfileService,
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

  async findAll(query: QueryEmployeesDto): Promise<EmployeeListResponseDto> {
    const { page = 1, limit = 20, search, status, roleId } = query;
    const qb = this.employeeRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.roles', 'r')
      .orderBy('e.ngayTao', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      const dbStatus = status === 'active' ? 'DangLam' : 'NghiViec';
      qb.andWhere('e.trangThai = :trangThai', { trangThai: dbStatus });
    }
    if (search) qb.andWhere('(e.hoTen LIKE :s OR e.email LIKE :s OR e.maNhanVien LIKE :s)', { s: `%${search}%` });
    if (roleId) qb.innerJoin('e.roles', 'rf', 'rf.id = :roleId', { roleId });

    const [employees, total] = await qb.getManyAndCount();
    return { data: employees.map((e) => this.toDto(e)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number): Promise<EmployeeResponseDto> {
    const employee = await this.employeeRepo.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });
    if (!employee) throw new NotFoundException(`Nhân viên #${id} không tồn tại`);
    return this.toDto(employee);
  }

  async findByCode(code: string): Promise<EmployeeResponseDto> {
    const employee = await this.employeeRepo.findOne({
      where: { maNhanVien: code },
      relations: ['roles', 'roles.permissions'],
    });
    if (!employee) throw new NotFoundException(`Nhân viên với mã "${code}" không tồn tại`);
    return this.toDto(employee);
  }

  async findByEmail(email: string): Promise<Employee | null> {
    return this.employeeRepo.findOne({
      where: { email },
      select: ['id', 'email', 'matKhauHash', 'hoTen', 'trangThai', 'maNhanVien'],
      relations: ['roles'],
    });
  }

  async findByIdWithRoles(id: number): Promise<Employee | null> {
    return this.employeeRepo.findOne({ where: { id }, relations: ['roles'] });
  }

  async create(dto: CreateEmployeeDto): Promise<EmployeeResponseDto> {
    const [emailExists, codeExists] = await Promise.all([
      this.employeeRepo.findOne({ where: { email: dto.email } }),
      this.employeeRepo.findOne({ where: { maNhanVien: dto.code } }),
    ]);
    if (emailExists) throw new ConflictException(`Email "${dto.email}" đã được sử dụng`);
    if (codeExists) throw new ConflictException(`Mã nhân viên "${dto.code}" đã tồn tại`);

    const tempPassword = crypto.randomBytes(8).toString('hex');
    const matKhauHash = await bcrypt.hash(tempPassword, 12);

    const employee = this.employeeRepo.create({
      maNhanVien: dto.code,
      email: dto.email,
      hoTen: dto.fullName,
      soDienThoai: dto.phone ?? null,
      gioiTinh: dto.gender ? GENDER_TO_DB[dto.gender] : null,
      ngaySinh: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
      ngayVaoLam: dto.hireDate ? new Date(dto.hireDate) : null,
      matKhauHash,
    });

    if (dto.roleIds?.length) {
      const roles = await this.roleRepo.findBy({ id: In(dto.roleIds) });
      if (roles.length !== dto.roleIds.length) throw new BadRequestException('Một số role ID không hợp lệ');
      employee.roles = roles;
    }

    const saved = await this.employeeRepo.save(employee);

    const roleNames = (saved.roles ?? []).map((r) => r.tenVaiTro);
    const hireDateStr = saved.ngayVaoLam ? toDateString(saved.ngayVaoLam) : null;
    const afterSnapshot = {
      code: saved.maNhanVien,
      fullName: saved.hoTen,
      email: saved.email,
      phone: saved.soDienThoai ?? null,
      roles: roleNames,
      status: 'Đang làm',
      hireDate: hireDateStr,
      gender: saved.gioiTinh ? (GENDER_DISPLAY[saved.gioiTinh] ?? null) : null,
      dateOfBirth: saved.ngaySinh ? toDateString(saved.ngaySinh) : null,
    };

    this.auditLogsService.log({
      entityType: EntityType.EMPLOYEE,
      entityId: saved.maNhanVien,
      entityLabel: saved.hoTen,
      actionType: AuditAction.CREATE,
      actionDetail: detailCreate(`nhân viên ${saved.hoTen}`, {
        'Mã': saved.maNhanVien,
        'Email': saved.email,
        'Vai trò': roleNames.length ? roleNames.join(', ') : '(chưa có)',
        'Ngày vào làm': hireDateStr ?? '(chưa có)',
      }),
      after: JSON.stringify(afterSnapshot),
    });

    void this.auditLogRepo.save(
      this.auditLogRepo.create({
        employeeId: saved.id,
        action: 'status_changed',
        details: truncate500(`Tài khoản được tạo bởi ${this.buildActorSuffix()} — Vai trò: ${roleNames.length ? roleNames.join(', ') : '(chưa có)'}`),
        ipAddress: null,
      }),
    );

    // TODO: send tempPassword via MailService (khi EmailService đã sẵn sàng)
    return this.toDto(saved);
  }

  async update(id: number, dto: UpdateEmployeeDto): Promise<EmployeeResponseDto> {
    const employee = await this.employeeRepo.findOne({ where: { id }, relations: ['roles'] });
    if (!employee) throw new NotFoundException(`Nhân viên #${id} không tồn tại`);

    const beforeSnapshot = {
      fullName: employee.hoTen,
      phone: employee.soDienThoai ?? null,
      gender: employee.gioiTinh ? (GENDER_DISPLAY[employee.gioiTinh] ?? null) : null,
      dateOfBirth: employee.ngaySinh ? toDateString(employee.ngaySinh) : null,
      hireDate: employee.ngayVaoLam ? toDateString(employee.ngayVaoLam) : null,
    };
    const beforeStatus = employee.trangThai;

    if (dto.fullName !== undefined) employee.hoTen = dto.fullName;
    if (dto.phone !== undefined) employee.soDienThoai = dto.phone;
    if (dto.gender !== undefined) employee.gioiTinh = dto.gender ? GENDER_TO_DB[dto.gender] : null;
    if (dto.dateOfBirth !== undefined) employee.ngaySinh = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    if (dto.hireDate !== undefined) employee.ngayVaoLam = dto.hireDate ? new Date(dto.hireDate) : null;
    if (dto.status !== undefined) employee.trangThai = STATUS_TO_DB[dto.status];

    const saved = await this.employeeRepo.save(employee);

    const afterSnapshot = {
      fullName: saved.hoTen,
      phone: saved.soDienThoai ?? null,
      gender: saved.gioiTinh ? (GENDER_DISPLAY[saved.gioiTinh] ?? null) : null,
      dateOfBirth: saved.ngaySinh ? toDateString(saved.ngaySinh) : null,
      hireDate: saved.ngayVaoLam ? toDateString(saved.ngayVaoLam) : null,
    };

    const isStatusChange = dto.status !== undefined && STATUS_TO_DB[dto.status] !== beforeStatus;

    if (isStatusChange) {
      this.auditLogsService.log({
        entityType: EntityType.EMPLOYEE,
        entityId: employee.maNhanVien,
        entityLabel: employee.hoTen,
        actionType: AuditAction.STATUS_CHANGE,
        actionDetail: detailStatusChange(employee.hoTen, beforeStatus, saved.trangThai, STATUS_DISPLAY),
        before: JSON.stringify({ status: STATUS_DISPLAY[beforeStatus] ?? beforeStatus }),
        after: JSON.stringify({ status: STATUS_DISPLAY[saved.trangThai] ?? saved.trangThai }),
      });
      void this.profileService.recordStatusChanged(employee.id, beforeStatus, saved.trangThai);
    } else {
      this.auditLogsService.log({
        entityType: EntityType.EMPLOYEE,
        entityId: employee.maNhanVien,
        entityLabel: employee.hoTen,
        actionType: AuditAction.UPDATE,
        actionDetail: detailUpdate(`NV ${employee.hoTen}`, beforeSnapshot as Record<string, unknown>, afterSnapshot as Record<string, unknown>, EMP_FIELD_LABELS),
        before: JSON.stringify(beforeSnapshot),
        after: JSON.stringify(afterSnapshot),
      });
    }

    return this.toDto(saved);
  }

  async remove(id: number): Promise<void> {
    const employee = await this.employeeRepo.findOne({ where: { id }, relations: ['roles'] });
    if (!employee) throw new NotFoundException(`Nhân viên #${id} không tồn tại`);
    const beforeStatus = employee.trangThai;
    await this.employeeRepo.update(id, { trangThai: 'NghiViec' });
    this.auditLogsService.log({
      entityType: EntityType.EMPLOYEE,
      entityId: employee.maNhanVien,
      entityLabel: employee.hoTen,
      actionType: AuditAction.SOFT_DELETE,
      actionDetail: `Vô hiệu hoá tài khoản ${employee.hoTen} — tài khoản đặt về trạng thái Nghỉ việc`,
      before: JSON.stringify({ status: STATUS_DISPLAY[beforeStatus] ?? beforeStatus }),
      after: JSON.stringify({ status: 'Nghỉ việc' }),
    });
    void this.profileService.recordStatusChanged(employee.id, beforeStatus, 'NghiViec');
  }

  async assignRoles(id: number, roleIds: number[]): Promise<EmployeeResponseDto> {
    const employee = await this.employeeRepo.findOne({ where: { id }, relations: ['roles'] });
    if (!employee) throw new NotFoundException(`Nhân viên #${id} không tồn tại`);

    const oldRoleIds = (employee.roles ?? []).map((r) => r.id).sort((a, b) => a - b);
    const oldRoleNames = (employee.roles ?? []).map((r) => r.tenVaiTro);

    const roles = await this.roleRepo.findBy({ id: In(roleIds) });
    if (roles.length !== roleIds.length) throw new BadRequestException('Một số role ID không hợp lệ');
    employee.roles = roles;
    const saved = await this.employeeRepo.save(employee);

    const newRoleNames = roles.map((r) => r.tenVaiTro);
    const newRoleIdsSorted = [...roleIds].sort((a, b) => a - b);
    const rolesChanged =
      oldRoleIds.length !== newRoleIdsSorted.length ||
      oldRoleIds.some((rid, i) => rid !== newRoleIdsSorted[i]);

    if (rolesChanged) {
      const oldLabel = oldRoleNames.length ? oldRoleNames.join(', ') : '(chưa có)';
      const newLabel = newRoleNames.length ? newRoleNames.join(', ') : '(chưa có)';
      this.auditLogsService.log({
        entityType: EntityType.EMPLOYEE,
        entityId: employee.maNhanVien,
        entityLabel: employee.hoTen,
        actionType: AuditAction.ASSIGN_ROLES,
        actionDetail: `Cập nhật vai trò ${employee.hoTen} — Trước: ${oldLabel}; Sau: ${newLabel}`,
        before: JSON.stringify({ roles: oldRoleNames }),
        after: JSON.stringify({ roles: newRoleNames }),
      });
      void this.profileService.recordRoleChanged(employee.id, oldRoleNames, newRoleNames);
    }

    return this.toDto(saved);
  }

  async getEmployeeAuditLogs(employeeId: number, page: number, limit: number, q?: string, action?: string) {
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
    return {
      data: logs.map((l) => ({
        id: String(l.id),
        action: l.action,
        details: l.details ?? '',
        ipAddress: l.ipAddress ?? '',
        createdAt: l.createdAt.toISOString(),
      })),
      total, page, limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async adminResetPassword(id: number, dto: AdminResetPasswordDto): Promise<void> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp');
    }

    const actorId = this.cls.get<number | null>('actorId');
    if (actorId !== null && actorId === id) {
      throw new ForbiddenException('Admin không thể tự đặt lại mật khẩu của chính mình');
    }

    const employee = await this.employeeRepo.findOne({ where: { id } });
    if (!employee) throw new NotFoundException(`Nhân viên #${id} không tồn tại`);

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.employeeRepo.update(id, { matKhauHash: newHash });

    const ipAddress = this.cls.get<string | null>('ipAddress') ?? null;

    this.auditLogsService.log({
      entityType: EntityType.EMPLOYEE,
      entityId: employee.maNhanVien,
      entityLabel: employee.hoTen,
      actionType: AuditAction.RESET_PASSWORD,
      actionDetail: `Đặt lại mật khẩu cho ${employee.hoTen} bởi ${this.buildActorSuffix()}`,
    });

    void this.auditLogRepo.save(
      this.auditLogRepo.create({
        employeeId: id,
        action: 'password_reset_by_admin',
        details: truncate500(`Mật khẩu được đặt lại bởi ${this.buildActorSuffix()}`),
        ipAddress,
      }),
    );
  }

  async validatePassword(employee: Employee, matKhau: string): Promise<boolean> {
    const raw = await this.employeeRepo.findOne({
      where: { id: employee.id },
      select: ['id', 'matKhauHash'],
    });
    if (!raw) return false;
    return bcrypt.compare(matKhau, raw.matKhauHash);
  }

  private toDto(employee: Employee): EmployeeResponseDto {
    return {
      id: String(employee.id),
      code: employee.maNhanVien,
      fullName: employee.hoTen,
      email: employee.email,
      phone: employee.soDienThoai ?? null,
      avatarUrl: employee.anhDaiDien ?? null,
      gender: employee.gioiTinh ? (GENDER_MAP[employee.gioiTinh] ?? null) : null,
      dateOfBirth: employee.ngaySinh ? toDateString(employee.ngaySinh) : null,
      roleIds: (employee.roles ?? []).map((r) => String(r.id)),
      roleNames: (employee.roles ?? []).map((r) => r.tenVaiTro),
      status: STATUS_MAP[employee.trangThai] ?? 'inactive',
      hireDate: employee.ngayVaoLam ? toDateString(employee.ngayVaoLam) : null,
      lastLoginAt: employee.dangNhapCuoi ? toDateTimeString(employee.dangNhapCuoi) : null,
      createdAt: toDateTimeString(employee.ngayTao),
    };
  }
}
