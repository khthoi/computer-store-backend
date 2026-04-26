import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { EmployeesService } from '../employees/employees.service';
import { ProfileService } from '../employees/profile.service';
import { RedisService } from '../../common/redis/redis.service';
import { Customer } from '../users/entities/customer.entity';
import { Employee } from '../employees/entities/employee.entity';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuthCustomerDto } from './dto/auth-customer.dto';
import { AuthEmployeeDto } from './dto/auth-employee.dto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ACCESS_EXPIRES_IN: any = process.env.JWT_EXPIRES_IN ?? '5h';

function parseTtlSeconds(val: string): number {
  const m = val.match(/^(\d+)(s|m|h|d)$/);
  if (!m) return 18000;
  const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return parseInt(m[1], 10) * (units[m[2]] ?? 1);
}

const ACCESS_TOKEN_TTL = parseTtlSeconds(ACCESS_EXPIRES_IN);
const REFRESH_TOKEN_TTL = parseTtlSeconds(process.env.JWT_REFRESH_EXPIRES_IN ?? '30d');
const REFRESH_SHORT_TOKEN_TTL = parseTtlSeconds(process.env.JWT_REFRESH_SHORT_TTL ?? '1d');

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly employeesService: EmployeesService,
    private readonly profileService: ProfileService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  // ─── Validate helpers (dùng bởi Passport strategies) ─────────────────────

  async validateCustomer(email: string, matKhau: string): Promise<Customer | null> {
    const customer = await this.usersService.findByEmail(email);
    if (!customer) return null;
    const ok = await bcrypt.compare(matKhau, customer.matKhauHash);
    return ok ? customer : null;
  }

  async validateEmployee(email: string, matKhau: string): Promise<Employee | null> {
    const employee = await this.employeesService.findByEmail(email);
    if (!employee) return null;
    const ok = await this.employeesService.validatePassword(employee, matKhau);
    return ok ? employee : null;
  }

  // ─── Register ─────────────────────────────────────────────────────────────

  async register(dto: RegisterCustomerDto): Promise<{ customer: AuthCustomerDto; accessToken: string; refreshToken: string }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email đã được đăng ký');

    const matKhauHash = await bcrypt.hash(dto.matKhau, 12);
    const customer = await this.usersService.create({
      email: dto.email,
      hoTen: dto.hoTen,
      matKhauHash,
      soDienThoai: dto.soDienThoai ?? null,
      trangThai: 'ChoXacMinh',
      xacMinhEmail: false,
    });

    // TODO: enqueue email verification job (Phase 6+)

    const tokens = await this.issueCustomerTokens(customer);
    return { customer: this.toCustomerDto(customer), ...tokens };
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async loginCustomer(customer: Customer, rememberMe = false): Promise<{ customer: AuthCustomerDto; accessToken: string; refreshToken: string }> {
    const tokens = await this.issueCustomerTokens(customer, rememberMe);
    return { customer: this.toCustomerDto(customer), ...tokens };
  }

  async loginEmployee(
    employee: Employee,
    ipAddress?: string,
  ): Promise<{ user: AuthEmployeeDto; accessToken: string; refreshToken: string }> {
    const fullEmployee = await this.employeesService.findByIdWithRoles(employee.id);
    if (!fullEmployee) throw new UnauthorizedException();
    const tokens = await this.issueEmployeeTokens(fullEmployee);
    // fire-and-forget: update lastLoginAt + audit log (non-blocking)
    void this.profileService.recordLogin(employee.id, ipAddress);
    return { user: this.toEmployeeDto(fullEmployee), ...tokens };
  }

  // ─── Refresh Token ────────────────────────────────────────────────────────

  async refreshToken(refreshToken: string) {
    let payload: JwtPayload;
    try {
      const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh_fallback');
      payload = this.jwtService.verify<JwtPayload>(refreshToken, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    if (payload.type === 'customer') {
      return this.refreshCustomerToken(payload, refreshToken);
    }
    return this.refreshEmployeeToken(payload, refreshToken);
  }

  private async refreshCustomerToken(payload: JwtPayload, refreshToken: string) {
    const sessionJti = payload.sessionJti;
    if (!sessionJti) throw new UnauthorizedException('Refresh token không hợp lệ');

    const stored = await this.redisService.getCustomerRefreshToken(payload.sub, sessionJti);
    if (!stored || stored !== refreshToken) {
      throw new UnauthorizedException('Refresh token đã bị thu hồi');
    }

    // Xoá session cũ rồi phát session mới (rotate refresh token)
    await this.redisService.removeCustomerSession(payload.sub, sessionJti);
    await this.redisService.removeCustomerRefreshToken(payload.sub, sessionJti);

    const newJti = randomUUID();
    const accessPayload: JwtPayload = { sub: payload.sub, email: payload.email, type: 'customer', roles: [], jti: newJti };
    const accessToken = this.jwtService.sign(accessPayload, { expiresIn: ACCESS_EXPIRES_IN });
    await this.redisService.addCustomerSession(payload.sub, newJti, ACCESS_TOKEN_TTL);

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh_fallback');
    const newRefreshJti = randomUUID();
    const refreshPayload: JwtPayload = { sub: payload.sub, email: payload.email, type: 'customer', roles: [], jti: newRefreshJti, sessionJti: newJti };
    const newRefreshToken = this.jwtService.sign(refreshPayload, { secret: refreshSecret, expiresIn: REFRESH_TOKEN_TTL });
    await this.redisService.addCustomerRefreshToken(payload.sub, newJti, newRefreshToken);

    return { accessToken, refreshToken: newRefreshToken };
  }

  private async refreshEmployeeToken(payload: JwtPayload, refreshToken: string) {
    const stored = await this.redisService.getRefreshToken(payload.sub, payload.type);
    if (!stored || stored !== refreshToken) {
      throw new UnauthorizedException('Refresh token đã bị thu hồi');
    }

    const oldJti = await this.redisService.getActiveJti(payload.sub, payload.type);
    if (oldJti) await this.redisService.blacklistToken(oldJti, ACCESS_TOKEN_TTL);

    const jti = randomUUID();
    const accessPayload: JwtPayload = { sub: payload.sub, email: payload.email, type: payload.type, roles: payload.roles, jti };
    const accessToken = this.jwtService.sign(accessPayload, { expiresIn: ACCESS_EXPIRES_IN });
    await this.redisService.saveActiveJti(payload.sub, payload.type, jti, ACCESS_TOKEN_TTL);

    return { accessToken };
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(user: JwtPayload, rawToken: string): Promise<void> {
    void rawToken;
    if (user.type === 'customer') {
      // Chỉ xoá phiên hiện tại, không ảnh hưởng thiết bị khác
      if (user.jti) {
        await this.redisService.removeCustomerSession(user.sub, user.jti);
        await this.redisService.removeCustomerRefreshToken(user.sub, user.jti);
      }
    } else {
      if (user.jti) {
        await this.redisService.blacklistToken(user.jti, ACCESS_TOKEN_TTL);
      }
      await this.redisService.deleteActiveJti(user.sub, user.type);
      await this.redisService.deleteRefreshToken(user.sub, user.type);
    }
  }

  // ─── Token issuers ────────────────────────────────────────────────────────

  private async issueCustomerTokens(customer: Customer, rememberMe = false) {
    const refreshTtl = rememberMe ? REFRESH_TOKEN_TTL : REFRESH_SHORT_TOKEN_TTL;

    const jti = randomUUID();
    const accessPayload: JwtPayload = { sub: customer.id, email: customer.email, type: 'customer', roles: [], jti };
    const accessToken = this.jwtService.sign(accessPayload, { expiresIn: ACCESS_EXPIRES_IN });
    await this.redisService.addCustomerSession(customer.id, jti, ACCESS_TOKEN_TTL);

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh_fallback');
    const refreshJti = randomUUID();
    // sessionJti liên kết refresh token này với access token vừa phát
    const refreshPayload: JwtPayload = { sub: customer.id, email: customer.email, type: 'customer', roles: [], jti: refreshJti, sessionJti: jti };
    const refreshToken = this.jwtService.sign(refreshPayload, { secret: refreshSecret, expiresIn: refreshTtl });
    await this.redisService.addCustomerRefreshToken(customer.id, jti, refreshToken);

    return { accessToken, refreshToken };
  }

  private async issueEmployeeTokens(employee: Employee) {
    const oldJti = await this.redisService.getActiveJti(employee.id, 'employee');
    if (oldJti) await this.redisService.blacklistToken(oldJti, ACCESS_TOKEN_TTL);

    const jti = randomUUID();
    const roles = employee.roles?.map((r) => r.tenVaiTro) ?? [];
    const accessPayload: JwtPayload = { sub: employee.id, email: employee.email, type: 'employee', roles, jti };
    const accessToken = this.jwtService.sign(accessPayload, { expiresIn: ACCESS_EXPIRES_IN });
    await this.redisService.saveActiveJti(employee.id, 'employee', jti, ACCESS_TOKEN_TTL);

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh_fallback');
    const refreshJti = randomUUID();
    const refreshPayload = { sub: employee.id, email: employee.email, type: 'employee', roles, jti: refreshJti };
    const refreshToken = this.jwtService.sign(refreshPayload, { secret: refreshSecret, expiresIn: REFRESH_TOKEN_TTL });
    await this.redisService.saveRefreshToken(employee.id, 'employee', refreshToken, REFRESH_TOKEN_TTL);

    return { accessToken, refreshToken };
  }

  // ─── Response mappers ─────────────────────────────────────────────────────

  private toCustomerDto(customer: Customer): AuthCustomerDto {
    return {
      id: customer.id,
      email: customer.email,
      hoTen: customer.hoTen,
      soDienThoai: customer.soDienThoai,
      gioiTinh: customer.gioiTinh,
      ngaySinh: customer.ngaySinh,
      anhDaiDien: customer.anhDaiDien,
      trangThai: customer.trangThai,
      ngayDangKy: customer.ngayDangKy,
      xacMinhEmail: customer.xacMinhEmail,
      diemHienTai: customer.diemHienTai,
      assetIdAvatar: customer.assetIdAvatar,
    };
  }

  private toEmployeeDto(employee: Employee): AuthEmployeeDto {
    return {
      id: String(employee.id),
      code: employee.maNhanVien,
      email: employee.email,
      fullName: employee.hoTen,
      avatar: employee.anhDaiDien ?? null,
      roles: employee.roles?.map((r) => r.tenVaiTro) ?? [],
    };
  }
}
