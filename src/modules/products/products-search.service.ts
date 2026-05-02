import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
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
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly brandsService: BrandsService,
  ) {}

  async findAll(query: QueryProductDto): Promise<{ data: ProductListResponse[]; total: number; page: number; limit: number; totalPages: number }> {
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
      .leftJoinAndSelect('v.stockLevel', 'sl')
      .skip((page - 1) * effectiveLimit)
      .take(effectiveLimit);

    if (effectiveSearch) {
      qb.andWhere('(p.tenSanPham LIKE :s OR p.maSanPham LIKE :s)', { s: `%${effectiveSearch}%` });
    }
    if (categoryId) {
      const catIds = await this.resolveDescendantIds(categoryId);
      qb.andWhere('p.danhMucId IN (:...catIds)', { catIds });
    }
    if (category) {
      const matched = await this.categoryRepo.find({
        where: { tenDanhMuc: Like(`%${category}%`) },
        select: ['id'],
      });
      if (!matched.length) {
        qb.andWhere('1 = 0');
      } else {
        const nested = await Promise.all(matched.map((c) => this.resolveDescendantIds(c.id)));
        const catNameIds = [...new Set(nested.flat())];
        qb.andWhere('p.danhMucId IN (:...catNameIds)', { catNameIds });
      }
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
      ngayCapNhat: 'p.ngayCapNhat',
      tenSanPham: 'p.tenSanPham',
      // Frontend-facing aliases (ProductsTable column keys)
      name: 'p.tenSanPham',
      updatedAt: 'p.ngayCapNhat',
      createdAt: 'p.ngayTao',
    };

    if (sortBy === 'totalStock') {
      qb.addSelect(
        '(SELECT COALESCE(SUM(_tk.so_luong_ton), 0) FROM ton_kho _tk INNER JOIN phien_ban_san_pham _pv ON _pv.phien_ban_id = _tk.phien_ban_id WHERE _pv.san_pham_id = p.id)',
        'total_stock_calc',
      );
      qb.orderBy('total_stock_calc', sortOrder.toUpperCase() as 'ASC' | 'DESC');
    } else if (sortBy === 'basePrice') {
      qb.addSelect(
        '(SELECT _pv.gia_ban FROM phien_ban_san_pham _pv WHERE _pv.san_pham_id = p.id AND _pv.is_mac_dinh = 1 LIMIT 1)',
        'base_price_calc',
      );
      qb.orderBy('base_price_calc', sortOrder.toUpperCase() as 'ASC' | 'DESC');
    } else {
      const orderCol = allowedSortBy[sortBy] ?? 'p.ngayCapNhat';
      qb.orderBy(orderCol, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    }

    const [items, total] = await qb.getManyAndCount();

    const productIds = items.map((p) => p.id);
    const brandMap = await this.brandsService.getBrandMapForProducts(productIds);

    const data = items.map((p) => mapProductListResponse(p, brandMap.get(p.id) ?? []));
    return { data, total, page, limit: effectiveLimit, totalPages: Math.ceil(total / effectiveLimit) };
  }

  /** BFS: returns rootId + all descendant category IDs. */
  private async resolveDescendantIds(rootId: number): Promise<number[]> {
    const ids: number[] = [rootId];
    let queue: number[] = [rootId];
    while (queue.length) {
      const children = await this.categoryRepo.find({
        where: { danhMucChaId: In(queue) },
        select: ['id'],
      });
      queue = children.map((c) => c.id);
      ids.push(...queue);
    }
    return ids;
  }
}
