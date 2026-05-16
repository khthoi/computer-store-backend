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
      brandIds,
      trangThai,
      status,
      minPrice,
      maxPrice,
      inStock,
      ratingMin,
      sortBy = 'ngayTao',
      sortOrder = 'DESC',
      specs,
      onSale,
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
    if (brandIds && brandIds.length > 0) {
      qb.innerJoin(
        'san_pham_thuong_hieu',
        'spth_multi',
        'spth_multi.san_pham_id = p.id AND spth_multi.thuong_hieu_id IN (:...brandIds)',
        { brandIds },
      );
    } else if (brandId) {
      qb.innerJoin(
        'san_pham_thuong_hieu',
        'spth',
        'spth.san_pham_id = p.id AND spth.thuong_hieu_id = :brandId',
        { brandId },
      );
    }
    if (inStock) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM ton_kho _tk INNER JOIN phien_ban_san_pham _pv2 ON _pv2.phien_ban_id = _tk.phien_ban_id WHERE _pv2.san_pham_id = p.id AND _tk.so_luong_ton > 0)',
      );
    }
    if (ratingMin !== undefined) {
      qb.andWhere('p.diemDanhGiaTb >= :ratingMin', { ratingMin });
    }
    if (onSale) {
      qb.andWhere(
        `(
          EXISTS (
            SELECT 1 FROM phien_ban_san_pham _pvs
            WHERE _pvs.san_pham_id = p.san_pham_id AND _pvs.gia_ban < _pvs.gia_goc
          )
          OR EXISTS (
            SELECT 1
            FROM flash_sale_item _fsi
            INNER JOIN phien_ban_san_pham _pvfs ON _pvfs.phien_ban_id = _fsi.phien_ban_id
            INNER JOIN flash_sale _fs ON _fs.flash_sale_id = _fsi.flash_sale_id
            WHERE _pvfs.san_pham_id = p.san_pham_id
              AND _fs.trang_thai = 'active'
              AND NOW() BETWEEN _fs.bat_dau AND _fs.ket_thuc
          )
        )`,
      );
    }

    if (specs?.length) {
      const parsed = this.parseSpecFilters(specs);
      parsed.forEach((f, idx) => {
        const sfx = `${idx}_${f.specTypeId}`;
        // NOTE: Use `p.san_pham_id` directly — TypeORM does not reliably translate
        // `p.id` → `p.san_pham_id` inside multi-line raw subqueries when joins are present.
        if (f.values?.length) {
          qb.andWhere(
            `EXISTS (SELECT 1 FROM gia_tri_thong_so gts_${sfx} INNER JOIN phien_ban_san_pham pv_${sfx} ON pv_${sfx}.phien_ban_id = gts_${sfx}.phien_ban_id WHERE pv_${sfx}.san_pham_id = p.san_pham_id AND gts_${sfx}.loai_thong_so_id = :stid_${sfx} AND COALESCE(gts_${sfx}.gia_tri_chuan, gts_${sfx}.gia_tri_thong_so) IN (:...vals_${sfx}))`,
            { [`stid_${sfx}`]: f.specTypeId, [`vals_${sfx}`]: f.values },
          );
        } else if (f.min != null || f.max != null) {
          const whereParts: string[] = [];
          const params: Record<string, number> = { [`stid_${sfx}`]: f.specTypeId };
          if (f.min != null) {
            whereParts.push(`gts_${sfx}.gia_tri_so >= :min_${sfx}`);
            params[`min_${sfx}`] = f.min;
          }
          if (f.max != null) {
            whereParts.push(`gts_${sfx}.gia_tri_so <= :max_${sfx}`);
            params[`max_${sfx}`] = f.max;
          }
          qb.andWhere(
            `EXISTS (SELECT 1 FROM gia_tri_thong_so gts_${sfx} INNER JOIN phien_ban_san_pham pv_${sfx} ON pv_${sfx}.phien_ban_id = gts_${sfx}.phien_ban_id WHERE pv_${sfx}.san_pham_id = p.san_pham_id AND gts_${sfx}.loai_thong_so_id = :stid_${sfx}${whereParts.length ? ' AND ' + whereParts.join(' AND ') : ''})`,
            params,
          );
        } else if (f.toggle) {
          qb.andWhere(
            `EXISTS (SELECT 1 FROM gia_tri_thong_so gts_${sfx} INNER JOIN phien_ban_san_pham pv_${sfx} ON pv_${sfx}.phien_ban_id = gts_${sfx}.phien_ban_id WHERE pv_${sfx}.san_pham_id = p.san_pham_id AND gts_${sfx}.loai_thong_so_id = :stid_${sfx} AND COALESCE(NULLIF(gts_${sfx}.gia_tri_chuan, ''), NULLIF(gts_${sfx}.gia_tri_thong_so, '')) IS NOT NULL)`,
            { [`stid_${sfx}`]: f.specTypeId },
          );
        }
      });
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

    if (sortBy === 'popularity') {
      // "Popular" = most-reviewed first, then highest-rated, then newest.
      qb.orderBy('p.soLuotDanhGia', 'DESC');
      qb.addOrderBy('p.diemDanhGiaTb', 'DESC');
      qb.addOrderBy('p.ngayTao', 'DESC');
    } else if (sortBy === 'totalStock') {
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

  /**
   * Parse `<specTypeId>:<spec>` strings from the URL into structured filters.
   * Skips entries with invalid typeId or empty spec.
   */
  private parseSpecFilters(input: string[]): Array<{
    specTypeId: number;
    values?: string[];
    min?: number;
    max?: number;
    toggle?: boolean;
  }> {
    const out: Array<{
      specTypeId: number;
      values?: string[];
      min?: number;
      max?: number;
      toggle?: boolean;
    }> = [];
    for (const raw of input) {
      if (typeof raw !== 'string') continue;
      const idx = raw.indexOf(':');
      if (idx <= 0) continue;
      const specTypeId = Number(raw.slice(0, idx));
      const rest = raw.slice(idx + 1).trim();
      if (!Number.isFinite(specTypeId) || specTypeId <= 0 || !rest) continue;

      if (rest === 'true') {
        out.push({ specTypeId, toggle: true });
        continue;
      }
      const rangeMatch = rest.match(/^(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)$/);
      if (rangeMatch) {
        const min = Number(rangeMatch[1]);
        const max = Number(rangeMatch[2]);
        if (Number.isFinite(min) || Number.isFinite(max)) {
          out.push({
            specTypeId,
            min: Number.isFinite(min) ? min : undefined,
            max: Number.isFinite(max) ? max : undefined,
          });
        }
        continue;
      }
      const values = rest
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      if (values.length) out.push({ specTypeId, values });
    }
    return out;
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
