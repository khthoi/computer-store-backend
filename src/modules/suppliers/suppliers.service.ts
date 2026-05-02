import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierResponseDto, PaginatedSuppliersDto } from './dto/supplier-response.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly repo: Repository<Supplier>,
  ) {}

  private mapToDto(s: Supplier, productCount = 0, totalOrders = 0): SupplierResponseDto {
    return {
      id: String(s.id),
      name: s.tenNhaCungCap,
      email: s.email ?? undefined,
      phone: s.soDienThoai ?? undefined,
      address: s.diaChi ?? undefined,
      contactName: s.nguoiLienHe ?? undefined,
      status: s.trangThai === 'DangHopTac' ? 'active' : 'inactive',
      leadTimeDays: s.leadTimeDays,
      notes: s.ghiChu ?? undefined,
      productCount,
      totalOrders,
      createdAt: s.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: s.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  private entityFromDto(dto: Partial<CreateSupplierDto>): Partial<Supplier> {
    const patch: Partial<Supplier> = {};
    if (dto.name !== undefined) patch.tenNhaCungCap = dto.name;
    if (dto.email !== undefined) patch.email = dto.email ?? null;
    if (dto.phone !== undefined) patch.soDienThoai = dto.phone ?? null;
    if (dto.address !== undefined) patch.diaChi = dto.address ?? null;
    if (dto.contactName !== undefined) patch.nguoiLienHe = dto.contactName ?? null;
    if (dto.status !== undefined) patch.trangThai = dto.status === 'inactive' ? 'NgungHopTac' : 'DangHopTac';
    if (dto.leadTimeDays !== undefined) patch.leadTimeDays = dto.leadTimeDays;
    if (dto.notes !== undefined) patch.ghiChu = dto.notes ?? null;
    return patch;
  }

  private async fetchCounts(ids: number[]): Promise<{ orderMap: Map<number, number>; productMap: Map<number, number> }> {
    if (ids.length === 0) return { orderMap: new Map(), productMap: new Map() };

    const [orderRows, productRows] = await Promise.all([
      this.repo.manager
        .createQueryBuilder()
        .select('pnk.nha_cung_cap_id', 'supplierId')
        .addSelect('COUNT(*)', 'cnt')
        .from('phieu_nhap_kho', 'pnk')
        .where('pnk.nha_cung_cap_id IN (:...ids)', { ids })
        .groupBy('pnk.nha_cung_cap_id')
        .getRawMany<{ supplierId: string; cnt: string }>(),
      this.repo.manager
        .createQueryBuilder()
        .select('pnk2.nha_cung_cap_id', 'supplierId')
        .addSelect('COUNT(DISTINCT cpn.phien_ban_id)', 'cnt')
        .from('chi_tiet_phieu_nhap', 'cpn')
        .innerJoin('phieu_nhap_kho', 'pnk2', 'cpn.phieu_nhap_id = pnk2.phieu_nhap_id')
        .where('pnk2.nha_cung_cap_id IN (:...ids)', { ids })
        .groupBy('pnk2.nha_cung_cap_id')
        .getRawMany<{ supplierId: string; cnt: string }>(),
    ]);

    return {
      orderMap: new Map(orderRows.map((r) => [Number(r.supplierId), Number(r.cnt)])),
      productMap: new Map(productRows.map((r) => [Number(r.supplierId), Number(r.cnt)])),
    };
  }

  async findAll(query: QuerySupplierDto): Promise<PaginatedSuppliersDto> {
    const { page = 1, limit = 10, search, status, sortBy = 'name', sortDir = 'asc' } = query;
    const skip = (page - 1) * limit;
    const order = sortDir.toUpperCase() as 'ASC' | 'DESC';

    const qb = this.repo.createQueryBuilder('s');

    if (search?.trim()) {
      qb.where(
        '(s.tenNhaCungCap LIKE :q OR s.email LIKE :q OR s.nguoiLienHe LIKE :q OR s.soDienThoai LIKE :q)',
        { q: `%${search.trim()}%` },
      );
    }
    if (status === 'active') qb.andWhere("s.trangThai = 'DangHopTac'");
    else if (status === 'inactive') qb.andWhere("s.trangThai = 'NgungHopTac'");

    const allowedSortBy: Record<string, string> = {
      name: 's.tenNhaCungCap',
      status: 's.trangThai',
      createdAt: 's.createdAt',
      updatedAt: 's.updatedAt',
    };

    if (sortBy === 'totalOrders') {
      qb.orderBy(
        '(SELECT COUNT(*) FROM phieu_nhap_kho pnk WHERE pnk.nha_cung_cap_id = s.nha_cung_cap_id)',
        order,
      );
    } else if (sortBy === 'productCount') {
      qb.orderBy(
        '(SELECT COUNT(DISTINCT cpn.phien_ban_id) FROM chi_tiet_phieu_nhap cpn INNER JOIN phieu_nhap_kho pnk ON cpn.phieu_nhap_id = pnk.phieu_nhap_id WHERE pnk.nha_cung_cap_id = s.nha_cung_cap_id)',
        order,
      );
    } else {
      qb.orderBy(allowedSortBy[sortBy] ?? 's.tenNhaCungCap', order);
    }

    const total = await qb.getCount();
    const suppliers = await qb.skip(skip).take(limit).getMany();
    const totalPages = Math.ceil(total / limit);

    const ids = suppliers.map((s) => s.id);
    const { orderMap, productMap } = await this.fetchCounts(ids);

    return {
      data: suppliers.map((s) => this.mapToDto(s, productMap.get(s.id) ?? 0, orderMap.get(s.id) ?? 0)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: number): Promise<SupplierResponseDto> {
    const s = await this.repo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Nhà cung cấp không tồn tại');
    const { orderMap, productMap } = await this.fetchCounts([id]);
    return this.mapToDto(s, productMap.get(id) ?? 0, orderMap.get(id) ?? 0);
  }

  async create(dto: CreateSupplierDto): Promise<SupplierResponseDto> {
    const supplier = this.repo.create(this.entityFromDto(dto));
    const saved = await this.repo.save(supplier);
    return this.mapToDto(saved);
  }

  async update(id: number, dto: UpdateSupplierDto): Promise<SupplierResponseDto> {
    const supplier = await this.repo.findOne({ where: { id } });
    if (!supplier) throw new NotFoundException('Nhà cung cấp không tồn tại');
    Object.assign(supplier, this.entityFromDto(dto));
    const saved = await this.repo.save(supplier);
    const { orderMap, productMap } = await this.fetchCounts([id]);
    return this.mapToDto(saved, productMap.get(id) ?? 0, orderMap.get(id) ?? 0);
  }

  async remove(id: number): Promise<void> {
    const supplier = await this.repo.findOne({ where: { id } });
    if (!supplier) throw new NotFoundException('Nhà cung cấp không tồn tại');
    supplier.trangThai = 'NgungHopTac';
    await this.repo.save(supplier);
  }
}
