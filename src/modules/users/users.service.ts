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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(ShippingAddress)
    private readonly addressRepo: Repository<ShippingAddress>,
  ) {}

  // ─── Profile ───────────────────────────────────────────────────────────────

  async getProfile(customerId: number): Promise<Customer> {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Khách hàng không tồn tại');
    return customer;
  }

  async updateProfile(customerId: number, dto: UpdateProfileDto): Promise<Customer> {
    const customer = await this.getProfile(customerId);
    Object.assign(customer, dto);
    return this.customerRepo.save(customer);
  }

  // ─── Addresses ─────────────────────────────────────────────────────────────

  async getAddresses(customerId: number): Promise<ShippingAddress[]> {
    return this.addressRepo.find({
      where: { khachHangId: customerId },
      order: { laMacDinh: 'DESC', id: 'ASC' },
    });
  }

  async addAddress(customerId: number, dto: CreateAddressDto): Promise<ShippingAddress> {
    if (dto.laMacDinh) {
      await this.addressRepo.update({ khachHangId: customerId }, { laMacDinh: false });
    }
    const address = this.addressRepo.create({ ...dto, khachHangId: customerId });
    return this.addressRepo.save(address);
  }

  async updateAddress(
    customerId: number,
    addressId: number,
    dto: UpdateAddressDto,
  ): Promise<ShippingAddress> {
    const address = await this.findAddressOrFail(customerId, addressId);
    if (dto.laMacDinh) {
      await this.addressRepo.update({ khachHangId: customerId }, { laMacDinh: false });
    }
    Object.assign(address, dto);
    return this.addressRepo.save(address);
  }

  async deleteAddress(customerId: number, addressId: number): Promise<void> {
    const address = await this.findAddressOrFail(customerId, addressId);
    await this.addressRepo.remove(address);
  }

  async setDefaultAddress(customerId: number, addressId: number): Promise<ShippingAddress> {
    const address = await this.findAddressOrFail(customerId, addressId);
    await this.addressRepo.update({ khachHangId: customerId }, { laMacDinh: false });
    address.laMacDinh = true;
    return this.addressRepo.save(address);
  }

  private async findAddressOrFail(customerId: number, addressId: number): Promise<ShippingAddress> {
    const address = await this.addressRepo.findOne({ where: { id: addressId } });
    if (!address) throw new NotFoundException(`Địa chỉ #${addressId} không tồn tại`);
    if (address.khachHangId !== customerId) throw new ForbiddenException('Không có quyền truy cập địa chỉ này');
    return address;
  }

  // ─── Admin operations ──────────────────────────────────────────────────────

  async findAll(query: QueryCustomersDto): Promise<{ data: Customer[]; total: number }> {
    const { page = 1, limit = 20, search, trangThai, email } = query;
    const where: Record<string, unknown> = {};
    if (trangThai) where['trangThai'] = trangThai;
    if (email) where['email'] = ILike(`%${email}%`);
    if (search) where['hoTen'] = ILike(`%${search}%`);

    const [data, total] = await this.customerRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { ngayDangKy: 'DESC' },
    });
    return { data, total };
  }

  async findById(id: number): Promise<Customer> {
    return this.getProfile(id);
  }

  async adminUpdate(id: number, dto: Partial<Customer>): Promise<Customer> {
    const customer = await this.getProfile(id);
    Object.assign(customer, dto);
    return this.customerRepo.save(customer);
  }

  async softDelete(id: number): Promise<void> {
    const customer = await this.getProfile(id);
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
}
