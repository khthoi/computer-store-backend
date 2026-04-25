import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { ProductBrand } from './entities/product-brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    @InjectRepository(ProductBrand)
    private readonly productBrandRepo: Repository<ProductBrand>,
  ) {}

  async findAll(): Promise<Brand[]> {
    return this.brandRepo.find({ order: { tenThuongHieu: 'ASC' } });
  }

  async findOne(id: number): Promise<Brand> {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) throw new NotFoundException('Thương hiệu không tồn tại');
    return brand;
  }

  async create(dto: CreateBrandDto): Promise<Brand> {
    const exists = await this.brandRepo.findOne({ where: { tenThuongHieu: dto.tenThuongHieu } });
    if (exists) throw new ConflictException('Tên thương hiệu đã tồn tại');
    return this.brandRepo.save(this.brandRepo.create(dto));
  }

  async update(id: number, dto: UpdateBrandDto): Promise<Brand> {
    const brand = await this.findOne(id);
    if (dto.tenThuongHieu && dto.tenThuongHieu !== brand.tenThuongHieu) {
      const exists = await this.brandRepo.findOne({ where: { tenThuongHieu: dto.tenThuongHieu } });
      if (exists) throw new ConflictException('Tên thương hiệu đã tồn tại');
    }
    Object.assign(brand, dto);
    return this.brandRepo.save(brand);
  }

  async remove(id: number): Promise<void> {
    const brand = await this.findOne(id);
    const linked = await this.productBrandRepo.count({ where: { thuongHieuId: id } });
    if (linked > 0) {
      brand.trangThai = 'An';
      await this.brandRepo.save(brand);
      return;
    }
    await this.brandRepo.remove(brand);
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
