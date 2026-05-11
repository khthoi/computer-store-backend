import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { ProductBrand } from './entities/product-brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { QueryBrandDto } from './dto/query-brand.dto';
import { BrandResponseDto, mapBrandToDto } from './dto/brand-response.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    @InjectRepository(ProductBrand)
    private readonly productBrandRepo: Repository<ProductBrand>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private async findEntityById(id: number): Promise<Brand> {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) throw new NotFoundException('Thương hiệu không tồn tại');
    return brand;
  }

  async findAll(query: QueryBrandDto = {}): Promise<{ data: BrandResponseDto[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.brandRepo.createQueryBuilder('b').orderBy('b.tenThuongHieu', 'ASC');

    if (query.q) {
      qb.andWhere('b.tenThuongHieu LIKE :q OR b.moTa LIKE :q', { q: `%${query.q}%` });
    }
    if (query.active !== undefined) {
      qb.andWhere('b.trangThai = :tt', { tt: query.active ? 'HienThi' : 'An' });
    }

    const [brands, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();

    if (!brands.length) {
      return { data: [], total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
    }

    const ids = brands.map((b) => b.id);
    const counts = await this.productBrandRepo
      .createQueryBuilder('pb')
      .select('pb.thuongHieuId', 'id')
      .addSelect('COUNT(*)', 'cnt')
      .where('pb.thuongHieuId IN (:...ids)', { ids })
      .groupBy('pb.thuongHieuId')
      .getRawMany();

    const countMap = new Map(counts.map((c) => [Number(c.id), Number(c.cnt)]));
    const data = brands.map((b) => mapBrandToDto(b, countMap.get(b.id) ?? 0));
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number): Promise<BrandResponseDto> {
    const brand = await this.findEntityById(id);
    const cnt = await this.productBrandRepo.count({ where: { thuongHieuId: id } });
    return mapBrandToDto(brand, cnt);
  }

  async create(dto: CreateBrandDto): Promise<BrandResponseDto> {
    const exists = await this.brandRepo.findOne({ where: { tenThuongHieu: dto.tenThuongHieu } });
    if (exists) throw new ConflictException('Tên thương hiệu đã tồn tại');
    const brand = await this.brandRepo.save(this.brandRepo.create(dto));
    this.auditLogsService.log({
      entityType: 'Brand',
      entityId: String(brand.id),
      entityLabel: brand.tenThuongHieu,
      actionType: 'CREATE',
      actionDetail: `Tạo thương hiệu "${brand.tenThuongHieu}"`,
      after: JSON.stringify({ id: brand.id, tenThuongHieu: brand.tenThuongHieu, slug: brand.slug }),
    });
    return mapBrandToDto(brand, 0);
  }

  async update(id: number, dto: UpdateBrandDto): Promise<BrandResponseDto> {
    const entity = await this.findEntityById(id);
    const beforeSnapshot = { tenThuongHieu: entity.tenThuongHieu, slug: entity.slug, logo: entity.logo };
    if (dto.tenThuongHieu && dto.tenThuongHieu !== entity.tenThuongHieu) {
      const exists = await this.brandRepo.findOne({ where: { tenThuongHieu: dto.tenThuongHieu } });
      if (exists) throw new ConflictException('Tên thương hiệu đã tồn tại');
    }
    Object.assign(entity, dto);
    const updated = await this.brandRepo.save(entity);
    this.auditLogsService.log({
      entityType: 'Brand',
      entityId: String(id),
      entityLabel: updated.tenThuongHieu,
      actionType: 'UPDATE',
      actionDetail: `Cập nhật thương hiệu "${updated.tenThuongHieu}"`,
      before: JSON.stringify(beforeSnapshot),
      after: JSON.stringify({ tenThuongHieu: updated.tenThuongHieu, slug: updated.slug, logo: updated.logo }),
    });
    const cnt = await this.productBrandRepo.count({ where: { thuongHieuId: id } });
    return mapBrandToDto(updated, cnt);
  }

  async remove(id: number): Promise<void> {
    const brand = await this.findEntityById(id);
    const linked = await this.productBrandRepo.count({ where: { thuongHieuId: id } });
    if (linked > 0) {
      const prevStatus = brand.trangThai;
      brand.trangThai = 'An';
      await this.brandRepo.save(brand);
      this.auditLogsService.log({
        entityType: 'Brand',
        entityId: String(id),
        entityLabel: brand.tenThuongHieu,
        actionType: 'SOFT_DELETE',
        actionDetail: `Ẩn thương hiệu "${brand.tenThuongHieu}" (còn ${linked} sản phẩm liên kết, không thể xóa cứng)`,
        before: JSON.stringify({ trangThai: prevStatus }),
        after: JSON.stringify({ trangThai: 'An' }),
      });
      return;
    }
    await this.brandRepo.remove(brand);
    this.auditLogsService.log({
      entityType: 'Brand',
      entityId: String(id),
      entityLabel: brand.tenThuongHieu,
      actionType: 'DELETE',
      actionDetail: `Xóa vĩnh viễn thương hiệu "${brand.tenThuongHieu}"`,
      before: JSON.stringify({ id: brand.id, tenThuongHieu: brand.tenThuongHieu }),
    });
  }

  async getProductBrands(sanPhamId: number): Promise<Brand[]> {
    const links = await this.productBrandRepo.find({ where: { sanPhamId } });
    const ids = links.map((l) => l.thuongHieuId);
    if (!ids.length) return [];
    return this.brandRepo.createQueryBuilder('b').whereInIds(ids).getMany();
  }

  async getBrandMapForProducts(sanPhamIds: number[]): Promise<Map<number, Brand[]>> {
    if (!sanPhamIds.length) return new Map();
    const links = await this.productBrandRepo.find({ where: { sanPhamId: In(sanPhamIds) } });
    if (!links.length) return new Map();
    const brandIds = [...new Set(links.map((l) => l.thuongHieuId))];
    const brands = await this.brandRepo.findBy({ id: In(brandIds) });
    const brandById = new Map(brands.map((b) => [b.id, b]));
    const result = new Map<number, Brand[]>();
    for (const link of links) {
      const b = brandById.get(link.thuongHieuId);
      if (!b) continue;
      if (!result.has(link.sanPhamId)) result.set(link.sanPhamId, []);
      result.get(link.sanPhamId)!.push(b);
    }
    return result;
  }

  async setProductBrands(sanPhamId: number, thuongHieuIds: number[]): Promise<void> {
    await this.productBrandRepo.delete({ sanPhamId });
    if (thuongHieuIds.length) {
      const records = thuongHieuIds.map((thuongHieuId) =>
        this.productBrandRepo.create({ sanPhamId, thuongHieuId }),
      );
      await this.productBrandRepo.save(records);
    }
  }
}
