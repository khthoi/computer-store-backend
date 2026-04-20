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

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  async findAll(query: QueryEmployeesDto): Promise<{ data: Employee[]; total: number }> {
    const { page = 1, limit = 20, search, trangThai } = query;
    const qb = this.employeeRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.roles', 'r')
      .orderBy('e.ngayTao', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (trangThai) qb.andWhere('e.trang_thai = :trangThai', { trangThai });
    if (search) qb.andWhere('(e.ho_ten LIKE :s OR e.email LIKE :s OR e.ma_nhan_vien LIKE :s)', { s: `%${search}%` });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findOne(id: number): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });
    if (!employee) throw new NotFoundException(`Nhân viên #${id} không tồn tại`);
    return employee;
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

  async create(dto: CreateEmployeeDto): Promise<Employee> {
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

    return this.employeeRepo.save(employee);
  }

  async update(id: number, dto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.findOne(id);
    Object.assign(employee, dto);
    return this.employeeRepo.save(employee);
  }

  async remove(id: number): Promise<void> {
    const employee = await this.findOne(id);
    employee.trangThai = 'NghiViec';
    await this.employeeRepo.save(employee);
  }

  async assignRoles(id: number, roleIds: number[]): Promise<Employee> {
    const employee = await this.findOne(id);
    const roles = await this.roleRepo.findBy({ id: In(roleIds) });
    if (roles.length !== roleIds.length) throw new BadRequestException('Một số role ID không hợp lệ');
    employee.roles = roles;
    return this.employeeRepo.save(employee);
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
}
