import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, QueryFailedError } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { Customer } from './entities/customer.entity';
import { ShippingAddress } from './entities/shipping-address.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { CustomerProfileResponseDto, CustomerListItemResponseDto, CustomerDetailResponseDto, CustomerListResponseDto } from './dto/customer-response.dto';
import { ShippingAddressResponseDto } from './dto/shipping-address-response.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction, EntityType } from '../audit-logs/audit-log.constants';
import { ClsService } from 'nestjs-cls';
import { AdminResetPasswordDto } from '../employees/dto/admin-reset-password.dto';
import { AdminCreateAddressDto, AdminUpdateAddressDto } from './dto/admin-address.dto';
import { AdminUpdateCustomerDto } from './dto/admin-update-customer.dto';
import { AdminCreateCustomerDto } from './dto/admin-create-customer.dto';
import { RedisService } from '../../common/redis/redis.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

const RESET_TOKEN_TTL = 24 * 3600; // 24 hours

/** Maximum shipping addresses a single customer may own. */
export const MAX_SHIPPING_ADDRESSES_PER_CUSTOMER = 3;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(ShippingAddress)
    private readonly addressRepo: Repository<ShippingAddress>,
    private readonly auditLogsService: AuditLogsService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly cls: ClsService,
  ) {
    cloudinary.config({
      cloud_name: configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  // ─── Profile ───────────────────────────────────────────────────────────────

  async getProfile(customerId: number): Promise<CustomerProfileResponseDto> {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Khách hàng không tồn tại');
    return this.toProfileDto(customer);
  }

  async updateProfile(customerId: number, dto: UpdateProfileDto): Promise<CustomerProfileResponseDto> {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Khách hàng không tồn tại');
    Object.assign(customer, dto);
    const saved = await this.customerRepo.save(customer);
    return this.toProfileDto(saved);
  }

  async uploadAvatar(customerId: number, file: Express.Multer.File): Promise<CustomerProfileResponseDto> {
    const today = new Date().toISOString().substring(0, 10);
    const rateKey = `avatar_daily:${customerId}:${today}`;
    const countStr = await this.redisService.get(rateKey);
    const count = countStr ? parseInt(countStr, 10) : 0;
    if (count >= 3) {
      throw new HttpException('Bạn đã đổi ảnh đại diện 3 lần hôm nay. Vui lòng thử lại vào ngày mai.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const url = await this.uploadAvatarToCloudinary(file);

    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Khách hàng không tồn tại');
    customer.anhDaiDien = url;
    const saved = await this.customerRepo.save(customer);

    const now = new Date();
    const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const ttl = Math.ceil((midnight.getTime() - now.getTime()) / 1000);
    await this.redisService.set(rateKey, String(count + 1), ttl);

    return this.toProfileDto(saved);
  }

  private uploadAvatarToCloudinary(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'pc-store/avatars', resource_type: 'image' },
        (error, result) => {
          if (error) return reject(new Error(error.message ?? 'Upload ảnh thất bại'));
          resolve((result as { secure_url: string }).secure_url);
        },
      );
      stream.end(file.buffer);
    });
  }

  // ─── Addresses ─────────────────────────────────────────────────────────────

  async getAddresses(customerId: number): Promise<ShippingAddressResponseDto[]> {
    const addresses = await this.addressRepo.find({
      where: { khachHangId: customerId },
      order: { laMacDinh: 'DESC', id: 'ASC' },
    });
    return addresses.map((a) => this.toAddressDto(a));
  }

  async addAddress(customerId: number, dto: CreateAddressDto): Promise<ShippingAddressResponseDto> {
    const existing = await this.addressRepo.count({ where: { khachHangId: customerId } });
    if (existing >= MAX_SHIPPING_ADDRESSES_PER_CUSTOMER) {
      throw new BadRequestException(
        `Bạn chỉ có thể lưu tối đa ${MAX_SHIPPING_ADDRESSES_PER_CUSTOMER} địa chỉ giao hàng. Hãy xóa bớt địa chỉ cũ trước khi thêm mới.`,
      );
    }
    if (dto.laMacDinh) {
      await this.addressRepo.update({ khachHangId: customerId }, { laMacDinh: false });
    }
    const address = this.addressRepo.create({ ...dto, khachHangId: customerId });
    const saved = await this.addressRepo.save(address);
    return this.toAddressDto(saved);
  }

  async updateAddress(
    customerId: number,
    addressId: number,
    dto: UpdateAddressDto,
  ): Promise<ShippingAddressResponseDto> {
    const address = await this.findAddressOrFail(customerId, addressId);
    if (dto.laMacDinh) {
      await this.addressRepo.update({ khachHangId: customerId }, { laMacDinh: false });
    }
    Object.assign(address, dto);
    const saved = await this.addressRepo.save(address);
    return this.toAddressDto(saved);
  }

  async deleteAddress(customerId: number, addressId: number): Promise<void> {
    const address = await this.findAddressOrFail(customerId, addressId);
    await this.addressRepo.remove(address);
  }

  async setDefaultAddress(customerId: number, addressId: number): Promise<ShippingAddressResponseDto> {
    const address = await this.findAddressOrFail(customerId, addressId);
    await this.addressRepo.update({ khachHangId: customerId }, { laMacDinh: false });
    address.laMacDinh = true;
    const saved = await this.addressRepo.save(address);
    return this.toAddressDto(saved);
  }

  private async findAddressOrFail(customerId: number, addressId: number): Promise<ShippingAddress> {
    const address = await this.addressRepo.findOne({ where: { id: addressId } });
    if (!address) throw new NotFoundException(`Địa chỉ #${addressId} không tồn tại`);
    if (address.khachHangId !== customerId) throw new ForbiddenException('Không có quyền truy cập địa chỉ này');
    return address;
  }

  // ─── Admin operations ──────────────────────────────────────────────────────

  async getNextCode(): Promise<{ code: string }> {
    const result = await this.customerRepo
      .createQueryBuilder('c')
      .select('MAX(c.id)', 'maxId')
      .getRawOne<{ maxId: string | null }>();
    const nextId = (Number(result?.maxId ?? 0) + 1);
    return { code: `KH-${String(nextId).padStart(4, '0')}` };
  }

  async adminCreate(dto: AdminCreateCustomerDto): Promise<CustomerDetailResponseDto> {
    const existing = await this.customerRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email đã được sử dụng');

    const tempPassword = randomBytes(16).toString('hex');
    const matKhauHash = await bcrypt.hash(tempPassword, 12);

    const statusMap: Record<string, string> = { active: 'HoatDong', inactive: 'ChoXacMinh', banned: 'BiKhoa' };
    const genderMap: Record<string, string> = { male: 'Nam', female: 'Nu', other: 'Khac' };

    const customer = this.customerRepo.create({
      email: dto.email,
      hoTen: dto.fullName,
      soDienThoai: dto.phone ?? null,
      trangThai: statusMap[dto.status ?? 'active'] ?? 'HoatDong',
      gioiTinh: dto.gender ? (genderMap[dto.gender] ?? null) : null,
      ngaySinh: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
      matKhauHash,
      xacMinhEmail: false,
    });

    let saved: Customer;
    try {
      saved = await this.customerRepo.save(customer);
    } catch (err) {
      if (err instanceof QueryFailedError) {
        const msg = (err as QueryFailedError & { sqlMessage?: string }).sqlMessage ?? '';
        if (msg.includes('uq_kh_sdt') || msg.includes('so_dien_thoai')) {
          throw new ConflictException('Số điện thoại đã được sử dụng bởi tài khoản khác');
        }
        if (msg.includes('uq_kh_email') || msg.includes('email')) {
          throw new ConflictException('Email đã được sử dụng bởi tài khoản khác');
        }
      }
      throw err;
    }
    this.auditLogsService.log({
      entityType: 'KhachHang',
      entityId: String(saved.id),
      entityLabel: saved.hoTen,
      actionType: 'TaoBoi',
      actionDetail: `Admin tạo tài khoản khách hàng ${saved.hoTen} (${saved.email})`,
      after: JSON.stringify({ email: saved.email, hoTen: saved.hoTen, trangThai: saved.trangThai }),
    });

    // Fire-and-forget: generate reset token and send welcome email
    void this.sendWelcomeEmail(saved.id, saved.email, saved.hoTen);

    return this.findByIdWithAddresses(saved.id);
  }

  async findAll(query: QueryCustomersDto): Promise<CustomerListResponseDto> {
    const { page = 1, limit = 20, search, status, email } = query;
    const statusMap: Record<string, string> = { active: 'HoatDong', banned: 'BiKhoa', inactive: 'ChoXacMinh' };
    const baseWhere: Record<string, unknown> = {};
    if (status) baseWhere['trangThai'] = statusMap[status] ?? status;
    if (email) baseWhere['email'] = ILike(`%${email}%`);

    const where = search
      ? [
          { ...baseWhere, hoTen: ILike(`%${search}%`) },
          { ...baseWhere, email: ILike(`%${search}%`) },
          { ...baseWhere, soDienThoai: ILike(`%${search}%`) },
        ]
      : baseWhere;

    const [customers, total] = await this.customerRepo.findAndCount({
      where,
      relations: ['addresses'],
      skip: (page - 1) * limit,
      take: limit,
      order: { ngayDangKy: 'DESC' },
    });
    return { data: customers.map((c) => this.toListItemDto(c)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByIdWithAddresses(id: number): Promise<CustomerDetailResponseDto> {
    const customer = await this.customerRepo.findOne({
      where: { id },
      relations: ['addresses'],
    });
    if (!customer) throw new NotFoundException('Khách hàng không tồn tại');
    return {
      ...this.toProfileDto(customer),
      shippingAddresses: (customer.addresses ?? []).map((a) => this.toAddressDto(a)),
    };
  }

  async adminUpdate(id: number, dto: Partial<Customer>): Promise<CustomerProfileResponseDto> {
    const customer = await this.customerRepo.findOne({ where: { id } });
    if (!customer) throw new NotFoundException('Khách hàng không tồn tại');
    const before = { hoTen: customer.hoTen, email: customer.email, trangThai: customer.trangThai, soDienThoai: customer.soDienThoai };
    Object.assign(customer, dto);
    const saved = await this.customerRepo.save(customer);
    const after = { hoTen: saved.hoTen, email: saved.email, trangThai: saved.trangThai, soDienThoai: saved.soDienThoai };
    this.auditLogsService.log({
      entityType: 'KhachHang',
      entityId: String(id),
      entityLabel: customer.hoTen,
      actionType: 'CapNhat',
      actionDetail: `Cập nhật thông tin ${customer.hoTen}`,
      before: JSON.stringify(before),
      after: JSON.stringify(after),
    });
    return this.toProfileDto(saved);
  }

  async softDelete(id: number): Promise<void> {
    const customer = await this.customerRepo.findOne({ where: { id } });
    if (!customer) throw new NotFoundException('Khách hàng không tồn tại');
    const oldStatus = customer.trangThai;
    customer.trangThai = 'BiKhoa';
    await this.customerRepo.save(customer);
    this.auditLogsService.log({
      entityType: 'KhachHang',
      entityId: String(id),
      entityLabel: customer.hoTen,
      actionType: 'DoiTrangThai',
      actionDetail: `Đổi trạng thái ${oldStatus} → BiKhoa`,
      before: JSON.stringify({ trangThai: oldStatus }),
      after: JSON.stringify({ trangThai: 'BiKhoa' }),
    });
  }

  async adminResetCustomerPassword(id: number, dto: AdminResetPasswordDto): Promise<void> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp');
    }

    const customer = await this.customerRepo.findOne({ where: { id } });
    if (!customer) throw new NotFoundException('Khách hàng không tồn tại');

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    customer.matKhauHash = newHash;
    await this.customerRepo.save(customer);

    const actorName = this.cls.get<string>('actorName') ?? 'Admin';
    const actorCode = this.cls.get<string | null>('actorCode');
    const actorLabel = actorCode ? `${actorName} [${actorCode}]` : actorName;

    this.auditLogsService.log({
      entityType: EntityType.CUSTOMER,
      entityId: String(id),
      entityLabel: customer.hoTen,
      actionType: AuditAction.RESET_PASSWORD,
      actionDetail: `Đặt lại mật khẩu cho khách hàng ${customer.hoTen} bởi ${actorLabel}`,
    });
  }

  // ─── Internal helpers (dùng bởi AuthService) ──────────────────────────────

  async findByEmail(email: string): Promise<Customer | null> {
    return this.customerRepo.findOne({
      where: { email },
      select: ['id', 'email', 'matKhauHash', 'hoTen', 'trangThai', 'xacMinhEmail'],
    });
  }

  async findByIdRaw(id: number): Promise<Customer | null> {
    return this.customerRepo.findOne({ where: { id } });
  }

  async create(data: Partial<Customer>): Promise<Customer> {
    const customer = this.customerRepo.create(data);
    return this.customerRepo.save(customer);
  }

  async findByGoogleId(googleId: string): Promise<Customer | null> {
    return this.customerRepo.findOne({ where: { googleId } });
  }

  async saveCustomer(customer: Customer): Promise<Customer> {
    return this.customerRepo.save(customer);
  }

  // ─── Admin full profile update ────────────────────────────────────────────

  async adminUpdateFull(id: number, dto: AdminUpdateCustomerDto): Promise<CustomerDetailResponseDto> {
    const customer = await this.customerRepo.findOne({ where: { id } });
    if (!customer) throw new NotFoundException('Khách hàng không tồn tại');
    const before = { hoTen: customer.hoTen, trangThai: customer.trangThai, soDienThoai: customer.soDienThoai };
    if (dto.fullName !== undefined) customer.hoTen = dto.fullName;
    if (dto.phone !== undefined) customer.soDienThoai = dto.phone;
    if (dto.gender !== undefined) customer.gioiTinh = dto.gender ? (this.GENDER_TO_DB[dto.gender] ?? dto.gender) : null;
    if (dto.dateOfBirth !== undefined) customer.ngaySinh = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    if (dto.status !== undefined) customer.trangThai = this.STATUS_TO_DB[dto.status] ?? dto.status;
    await this.customerRepo.save(customer);
    const after = { hoTen: customer.hoTen, trangThai: customer.trangThai, soDienThoai: customer.soDienThoai };
    this.auditLogsService.log({
      entityType: 'KhachHang', entityId: String(id), entityLabel: customer.hoTen,
      actionType: 'CapNhat', actionDetail: `Cập nhật thông tin ${customer.hoTen}`,
      before: JSON.stringify(before), after: JSON.stringify(after),
    });
    return this.findByIdWithAddresses(id);
  }

  // ─── Admin address CRUD ───────────────────────────────────────────────────

  async adminAddAddress(customerId: number, dto: AdminCreateAddressDto): Promise<ShippingAddressResponseDto> {
    const existing = await this.addressRepo.count({ where: { khachHangId: customerId } });
    if (existing >= MAX_SHIPPING_ADDRESSES_PER_CUSTOMER) {
      throw new BadRequestException(
        `Khách hàng đã đạt giới hạn tối đa ${MAX_SHIPPING_ADDRESSES_PER_CUSTOMER} địa chỉ giao hàng.`,
      );
    }
    if (dto.isDefault) {
      await this.addressRepo.update({ khachHangId: customerId }, { laMacDinh: false });
    }
    const address = this.addressRepo.create({
      khachHangId: customerId,
      hoTenNguoiNhan: dto.recipientName,
      soDienThoaiNhan: dto.phone,
      diaChiChiTiet: dto.addressLine,
      phuongXa: dto.ward ?? '',
      quanHuyen: dto.district,
      tinhThanhPho: dto.province,
      laMacDinh: dto.isDefault ?? false,
    });
    const saved = await this.addressRepo.save(address);
    return this.toAddressDto(saved);
  }

  async adminUpdateAddress(customerId: number, addressId: number, dto: AdminUpdateAddressDto): Promise<ShippingAddressResponseDto> {
    const address = await this.findAddressOrFail(customerId, addressId);
    if (dto.isDefault) {
      await this.addressRepo.update({ khachHangId: customerId }, { laMacDinh: false });
    }
    if (dto.recipientName !== undefined) address.hoTenNguoiNhan = dto.recipientName;
    if (dto.phone !== undefined) address.soDienThoaiNhan = dto.phone;
    if (dto.addressLine !== undefined) address.diaChiChiTiet = dto.addressLine;
    if (dto.ward !== undefined) address.phuongXa = dto.ward;
    if (dto.district !== undefined) address.quanHuyen = dto.district;
    if (dto.province !== undefined) address.tinhThanhPho = dto.province;
    if (dto.isDefault !== undefined) address.laMacDinh = dto.isDefault;
    const saved = await this.addressRepo.save(address);
    return this.toAddressDto(saved);
  }

  // ─── Response mappers ─────────────────────────────────────────────────────

  private readonly STATUS_MAP: Record<string, string> = {
    HoatDong: 'active',
    BiKhoa: 'banned',
    ChoXacMinh: 'inactive',
  };

  private readonly STATUS_TO_DB: Record<string, string> = {
    active: 'HoatDong',
    inactive: 'ChoXacMinh',
    banned: 'BiKhoa',
  };

  private readonly GENDER_MAP: Record<string, string> = {
    Nam: 'male',
    Nu: 'female',
    'Nữ': 'female',   // legacy data with diacritic — normalize on next write
    Khac: 'other',
  };

  private readonly GENDER_TO_DB: Record<string, string> = {
    male: 'Nam',
    female: 'Nu',
    other: 'Khac',
  };

  private toProfileDto(c: Customer): CustomerProfileResponseDto {
    const idStr = String(c.id);
    return {
      id: idStr,
      code: `KH-${idStr.padStart(4, '0')}`,
      email: c.email,
      fullName: c.hoTen,
      phone: c.soDienThoai,
      gender: c.gioiTinh ? (this.GENDER_MAP[c.gioiTinh] ?? 'other') : null,
      dateOfBirth: c.ngaySinh ? (c.ngaySinh instanceof Date ? c.ngaySinh.toISOString() : String(c.ngaySinh)).substring(0, 10) : null,
      avatarUrl: c.anhDaiDien,
      status: this.STATUS_MAP[c.trangThai] ?? c.trangThai,
      registeredAt: c.ngayDangKy.toISOString(),
      emailVerified: c.xacMinhEmail,
      points: c.diemHienTai,
      assetIdAvatar: c.assetIdAvatar,
      totalOrders: 0,
      totalSpent: 0,
      lastOrderAt: null,
    };
  }

  private toListItemDto(c: Customer): CustomerListItemResponseDto {
    const idStr = String(c.id);
    return {
      id: idStr,
      code: `KH-${idStr.padStart(4, '0')}`,
      email: c.email,
      fullName: c.hoTen,
      phone: c.soDienThoai,
      gender: c.gioiTinh ? (this.GENDER_MAP[c.gioiTinh] ?? 'other') : null,
      dateOfBirth: c.ngaySinh ? (c.ngaySinh instanceof Date ? c.ngaySinh.toISOString() : String(c.ngaySinh)).substring(0, 10) : null,
      status: this.STATUS_MAP[c.trangThai] ?? c.trangThai,
      registeredAt: c.ngayDangKy.toISOString(),
      points: c.diemHienTai,
      totalOrders: 0,
      totalSpent: 0,
      lastOrderAt: null,
      shippingAddresses: (c.addresses ?? []).map((a) => this.toAddressDto(a)),
    };
  }

  private toAddressDto(a: ShippingAddress): ShippingAddressResponseDto {
    return {
      id: String(a.id),
      customerId: String(a.khachHangId),
      recipientName: a.hoTenNguoiNhan,
      phone: a.soDienThoaiNhan,
      addressLine: a.diaChiChiTiet,
      ward: a.phuongXa ?? '',
      district: a.quanHuyen,
      province: a.tinhThanhPho,
      isDefault: a.laMacDinh,
      createdAt: a.ngayTao ? a.ngayTao.toISOString() : '',
    };
  }

  async updatePasswordHash(customerId: number, newHash: string): Promise<void> {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Khách hàng không tồn tại');
    customer.matKhauHash = newHash;
    customer.xacMinhEmail = true;
    await this.customerRepo.save(customer);
  }

  private async sendWelcomeEmail(customerId: number, email: string, fullName: string): Promise<void> {
    try {
      const token = randomBytes(32).toString('hex');
      await this.redisService.savePasswordResetToken(token, customerId, RESET_TOKEN_TTL);
      const clientUrl = this.configService.get<string>('CLIENT_FRONTEND_URL', 'http://localhost:3000');
      const resetLink = `${clientUrl}/reset-password?token=${token}`;
      await this.mailService.sendWelcomeWithResetLink({
        to: email,
        fullName,
        resetLink,
        expiresHours: RESET_TOKEN_TTL / 3600,
      });
    } catch (err) {
      this.logger.error(`Failed to send welcome email for customer ${customerId}`, err);
    }
  }
}
