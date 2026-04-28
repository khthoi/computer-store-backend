import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ILike } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Employee } from './entities/employee.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryEmployeesDto } from './dto/query-employees.dto';
import { EmployeeResponseDto, EmployeeListResponseDto } from './dto/employee-response.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  async findAll(query: QueryEmployeesDto): Promise<EmployeeListResponseDto> {
    const { page = 1, limit = 20, search, trangThai } = query;
    const qb = this.employeeRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.roles', 'r')
      .orderBy('e.ngayTao', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (trangThai) qb.andWhere('e.trangThai = :trangThai', { trangThai });
    if (search) qb.andWhere('(e.hoTen LIKE :s OR e.email LIKE :s OR e.maNhanVien LIKE :s)', { s: `%${search}%` });

    const [employees, total] = await qb.getManyAndCount();
    return { items: employees.map((e) => this.toDto(e)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number): Promise<EmployeeResponseDto> {
    const employee = await this.employeeRepo.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });
    if (!employee) throw new NotFoundException(`Nhân viên #${id} không tồn tại`);
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
    const [emailExists, maExists] = await Promise.all([
      this.employeeRepo.findOne({ where: { email: dto.email } }),
      this.employeeRepo.findOne({ where: { maNhanVien: dto.maNhanVien } }),
    ]);
    if (emailExists) throw new ConflictException(`Email "${dto.email}" đã được sử dụng`);
    if (maExists) throw new ConflictException(`Mã nhân viên "${dto.maNhanVien}" đã tồn tại`);

    const matKhauHash = await bcrypt.hash(dto.matKhau, 12);
    const employee = this.employeeRepo.create({
      maNhanVien: dto.maNhanVien,
      email: dto.email,
      hoTen: dto.hoTen,
      gioiTinh: dto.gioiTinh ?? null,
      matKhauHash,
    });

    if (dto.roleIds?.length) {
      const roles = await this.roleRepo.findBy({ id: In(dto.roleIds) });
      if (roles.length !== dto.roleIds.length) throw new BadRequestException('Một số role ID không hợp lệ');
      employee.roles = roles;
    }

    const saved = await this.employeeRepo.save(employee);
    return this.toDto(saved);
  }

  async update(id: number, dto: UpdateEmployeeDto): Promise<EmployeeResponseDto> {
    const employee = await this.employeeRepo.findOne({ where: { id }, relations: ['roles'] });
    if (!employee) throw new NotFoundException(`Nhân viên #${id} không tồn tại`);
    Object.assign(employee, dto);
    const saved = await this.employeeRepo.save(employee);
    return this.toDto(saved);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.employeeRepo.update(id, { trangThai: 'NghiViec' });
  }

  async assignRoles(id: number, roleIds: number[]): Promise<EmployeeResponseDto> {
    const employee = await this.employeeRepo.findOne({ where: { id }, relations: ['roles'] });
    if (!employee) throw new NotFoundException(`Nhân viên #${id} không tồn tại`);
    const roles = await this.roleRepo.findBy({ id: In(roleIds) });
    if (roles.length !== roleIds.length) throw new BadRequestException('Một số role ID không hợp lệ');
    employee.roles = roles;
    const saved = await this.employeeRepo.save(employee);
    return this.toDto(saved);
  }

  async validatePassword(employee: Employee, matKhau: string): Promise<boolean> {
    // Re-fetch with matKhauHash (select: false field)
    const raw = await this.employeeRepo.findOne({
      where: { id: employee.id },
      select: ['id', 'matKhauHash'],
    });
    if (!raw) return false;
    return bcrypt.compare(matKhau, raw.matKhauHash);
  }

  private toDto(employee: Employee): EmployeeResponseDto {
    return {
      id: employee.id,
      maNhanVien: employee.maNhanVien,
      email: employee.email,
      hoTen: employee.hoTen,
      gioiTinh: employee.gioiTinh,
      anhDaiDien: employee.anhDaiDien,
      trangThai: employee.trangThai,
      ngayTao: employee.ngayTao,
      assetIdAvatar: employee.assetIdAvatar,
      roles: (employee.roles ?? []).map((r) => ({ id: r.id, name: r.tenVaiTro })),
    };
  }
}
