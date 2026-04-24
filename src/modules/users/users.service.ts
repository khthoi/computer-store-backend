import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { ShippingAddress } from './entities/shipping-address.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { CustomerProfileResponseDto, CustomerListItemResponseDto, CustomerDetailResponseDto, CustomerListResponseDto } from './dto/customer-response.dto';
import { ShippingAddressResponseDto } from './dto/shipping-address-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(ShippingAddress)
    private readonly addressRepo: Repository<ShippingAddress>,
  ) {}

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

  // ─── Addresses ─────────────────────────────────────────────────────────────

  async getAddresses(customerId: number): Promise<ShippingAddressResponseDto[]> {
    const addresses = await this.addressRepo.find({
      where: { khachHangId: customerId },
      order: { laMacDinh: 'DESC', id: 'ASC' },
    });
    return addresses.map((a) => this.toAddressDto(a));
  }

  async addAddress(customerId: number, dto: CreateAddressDto): Promise<ShippingAddressResponseDto> {
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

  async findAll(query: QueryCustomersDto): Promise<CustomerListResponseDto> {
    const { page = 1, limit = 20, search, trangThai, email } = query;
    const where: Record<string, unknown> = {};
    if (trangThai) where['trangThai'] = trangThai;
    if (email) where['email'] = ILike(`%${email}%`);
    if (search) where['hoTen'] = ILike(`%${search}%`);

    const [customers, total] = await this.customerRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { ngayDangKy: 'DESC' },
    });
    return { items: customers.map((c) => this.toListItemDto(c)), total, page, limit };
  }

  async findByIdWithAddresses(id: number): Promise<CustomerDetailResponseDto> {
    const customer = await this.customerRepo.findOne({
      where: { id },
      relations: ['addresses'],
    });
    if (!customer) throw new NotFoundException('Khách hàng không tồn tại');
    return {
      ...this.toProfileDto(customer),
      addresses: (customer.addresses ?? []).map((a) => this.toAddressDto(a)),
    };
  }

  async adminUpdate(id: number, dto: Partial<Customer>): Promise<CustomerProfileResponseDto> {
    const customer = await this.customerRepo.findOne({ where: { id } });
    if (!customer) throw new NotFoundException('Khách hàng không tồn tại');
    Object.assign(customer, dto);
    const saved = await this.customerRepo.save(customer);
    return this.toProfileDto(saved);
  }

  async softDelete(id: number): Promise<void> {
    const customer = await this.customerRepo.findOne({ where: { id } });
    if (!customer) throw new NotFoundException('Khách hàng không tồn tại');
    customer.trangThai = 'BiKhoa';
    await this.customerRepo.save(customer);
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

  // ─── Response mappers ─────────────────────────────────────────────────────

  private toProfileDto(c: Customer): CustomerProfileResponseDto {
    return {
      id: c.id,
      email: c.email,
      hoTen: c.hoTen,
      soDienThoai: c.soDienThoai,
      gioiTinh: c.gioiTinh,
      ngaySinh: c.ngaySinh,
      anhDaiDien: c.anhDaiDien,
      trangThai: c.trangThai,
      ngayDangKy: c.ngayDangKy,
      xacMinhEmail: c.xacMinhEmail,
      diemHienTai: c.diemHienTai,
      assetIdAvatar: c.assetIdAvatar,
    };
  }

  private toListItemDto(c: Customer): CustomerListItemResponseDto {
    return {
      id: c.id,
      email: c.email,
      hoTen: c.hoTen,
      soDienThoai: c.soDienThoai,
      trangThai: c.trangThai,
      ngayDangKy: c.ngayDangKy,
      diemHienTai: c.diemHienTai,
    };
  }

  private toAddressDto(a: ShippingAddress): ShippingAddressResponseDto {
    return {
      id: a.id,
      hoTenNguoiNhan: a.hoTenNguoiNhan,
      soDienThoaiNhan: a.soDienThoaiNhan,
      diaChiChiTiet: a.diaChiChiTiet,
      quanHuyen: a.quanHuyen,
      tinhThanhPho: a.tinhThanhPho,
      laMacDinh: a.laMacDinh,
    };
  }
}
