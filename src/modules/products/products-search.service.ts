import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { QueryProductDto } from './dto/query-product.dto';
import { BrandsService } from '../brands/brands.service';
import {
  ProductListResponse,
  mapProductListResponse,
  mapFrontendStatusToDb,
} from './dto/product-response.dto';

@Injectable()
export class ProductsSearchService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly brandsService: BrandsService,
  ) {}

  async findAll(query: QueryProductDto): Promise<{ data: ProductListResponse[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      pageSize,
      search,
      q,
      categoryId,
      category,
      brandId,
      trangThai,
      status,
      minPrice,
      maxPrice,
      sortBy = 'ngayTao',
      sortOrder = 'DESC',
    } = query;

    const effectiveLimit = Math.min(pageSize ?? limit, 1000);
    const effectiveSearch = q ?? search;
    const effectiveTrangThai = status ? mapFrontendStatusToDb(status) : trangThai;

    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.danhMuc', 'dm')
      .leftJoinAndSelect('p.variants', 'v')
      .leftJoinAndSelect('v.images', 'img')
      .skip((page - 1) * effectiveLimit)
      .take(effectiveLimit);

    if (effectiveSearch) {
      qb.andWhere('(p.tenSanPham LIKE :s OR p.maSanPham LIKE :s)', { s: `%${effectiveSearch}%` });
    }
    if (categoryId) {
      qb.andWhere('p.danhMucId = :categoryId', { categoryId });
    }
    if (category) {
      qb.andWhere('dm.tenDanhMuc LIKE :cat', { cat: `%${category}%` });
    }
    if (effectiveTrangThai) {
      qb.andWhere('p.trangThai = :trangThai', { trangThai: effectiveTrangThai });
    }
    if (minPrice !== undefined) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM phien_ban_san_pham _pf WHERE _pf.san_pham_id = p.id AND _pf.gia_ban >= :minPrice)',
        { minPrice },
      );
    }
    if (maxPrice !== undefined) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM phien_ban_san_pham _pf WHERE _pf.san_pham_id = p.id AND _pf.gia_ban <= :maxPrice)',
        { maxPrice },
      );
    }
    if (brandId) {
      qb.innerJoin(
        'san_pham_thuong_hieu',
        'spth',
        'spth.san_pham_id = p.id AND spth.thuong_hieu_id = :brandId',
        { brandId },
      );
    }

    const allowedSortBy: Record<string, string> = {
      ngayTao: 'p.ngayTao',
      tenSanPham: 'p.tenSanPham',
    };
    const orderCol = allowedSortBy[sortBy] ?? 'p.ngayTao';
    qb.orderBy(orderCol, sortOrder as 'ASC' | 'DESC');

    const [items, total] = await qb.getManyAndCount();

    const productIds = items.map((p) => p.id);
    const brandMap = await this.brandsService.getBrandMapForProducts(productIds);

    const data = items.map((p) => mapProductListResponse(p, brandMap.get(p.id) ?? []));
    return { data, total };
  }
}
