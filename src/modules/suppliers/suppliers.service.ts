import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly repo: Repository<Supplier>,
  ) {}

  findAll() {
    return this.repo.find({ order: { tenNhaCungCap: 'ASC' } });
  }

  async findOne(id: number): Promise<Supplier> {
    const supplier = await this.repo.findOne({ where: { id } });
    if (!supplier) throw new NotFoundException('Nhà cung cấp không tồn tại');
    return supplier;
  }

  create(dto: CreateSupplierDto) {
    const supplier = this.repo.create(dto as Partial<Supplier>);
    return this.repo.save(supplier);
  }

  async update(id: number, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(id);
    Object.assign(supplier, dto);
    return this.repo.save(supplier);
  }

  async remove(id: number): Promise<void> {
    const supplier = await this.findOne(id);
    supplier.trangThai = 'NgungHopTac';
    await this.repo.save(supplier);
  }
}
