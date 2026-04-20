import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { QueryProductDto } from './dto/query-product.dto';

@Injectable()
export class ProductsSearchService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async findAll(query: QueryProductDto) {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      brandId,
      trangThai,
      minPrice,
      maxPrice,
      sortBy = 'ngayTao',
      sortOrder = 'DESC',
    } = query;

    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.variants', 'v', "v.trangThai = 'HienThi' AND v.isMacDinh = :isDefault", { isDefault: true })
      .leftJoinAndSelect('v.images', 'img')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere('p.tenSanPham LIKE :search', { search: `%${search}%` });
    }
    if (categoryId) {
      qb.andWhere('p.danhMucId = :categoryId', { categoryId });
    }
    if (trangThai) {
      qb.andWhere('p.trangThai = :trangThai', { trangThai });
    } else {
      qb.andWhere("p.trangThai != 'Nhap'");
    }
    if (minPrice !== undefined) {
      qb.andWhere('v.giaBan >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      qb.andWhere('v.giaBan <= :maxPrice', { maxPrice });
    }
    if (brandId) {
      qb.innerJoin('san_pham_thuong_hieu', 'spth', 'spth.san_pham_id = p.id AND spth.thuong_hieu_id = :brandId', { brandId });
    }

    const allowedSortBy: Record<string, string> = {
      ngayTao: 'p.ngayTao',
      tenSanPham: 'p.tenSanPham',
      giaBan: 'v.giaBan',
    };
    const orderCol = allowedSortBy[sortBy] ?? 'p.ngayTao';
    qb.orderBy(orderCol, sortOrder as 'ASC' | 'DESC');

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }
}
