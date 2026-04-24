import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProductViewHistory } from './entities/product-view-history.entity';
import { SearchQueryDto } from './dto/search-query.dto';
import {
  SearchResultDto,
  SearchResultItemDto,
  SuggestionDto,
  ViewHistoryItemDto,
} from './dto/search-response.dto';

const SORT_COLUMN_MAP: Record<string, string> = {
  name: 'sp.ten_san_pham',
  price: 'v.gia_ban',
  avgRating: 'sp.diem_danh_gia_tb',
  createdAt: 'sp.ngay_tao',
};

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(ProductViewHistory)
    private readonly historyRepo: Repository<ProductViewHistory>,
    private readonly dataSource: DataSource,
  ) {}

  async search(query: SearchQueryDto): Promise<SearchResultDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const sortCol = SORT_COLUMN_MAP[query.sortBy ?? 'createdAt'] ?? 'sp.ngay_tao';
    const sortDir = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const conditions: string[] = ["sp.trang_thai = 'DangBan'"];
    const params: unknown[] = [];

    if (query.q) {
      conditions.push('MATCH(sp.ten_san_pham, sp.mo_ta_ngan) AGAINST(? IN BOOLEAN MODE)');
      params.push(`${query.q}*`);
    }
    if (query.categoryId) {
      conditions.push('sp.danh_muc_id = ?');
      params.push(query.categoryId);
    }
    if (query.brandId) {
      conditions.push('sp.thuong_hieu_id = ?');
      params.push(query.brandId);
    }
    if (query.minPrice != null) {
      conditions.push('v.gia_ban >= ?');
      params.push(query.minPrice);
    }
    if (query.maxPrice != null) {
      conditions.push('v.gia_ban <= ?');
      params.push(query.maxPrice);
    }

    const where = conditions.join(' AND ');
    const baseQuery = `
      FROM san_pham sp
      INNER JOIN phien_ban_san_pham v ON v.san_pham_id = sp.san_pham_id AND v.is_mac_dinh = true
      WHERE ${where}`;

    const [[{ total }], rows] = await Promise.all([
      this.dataSource.query(`SELECT COUNT(DISTINCT sp.san_pham_id) AS total ${baseQuery}`, params),
      this.dataSource.query(
        `SELECT sp.san_pham_id, sp.ten_san_pham, sp.Slug AS slug,
                sp.diem_danh_gia_tb, sp.so_luot_danh_gia,
                v.phien_ban_id, v.gia_ban, v.trang_thai AS variant_status
         ${baseQuery}
         ORDER BY ${sortCol} ${sortDir}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      ),
    ]);

    return {
      items: rows.map((r: any): SearchResultItemDto => ({
        id: r.san_pham_id,
        name: r.ten_san_pham,
        slug: r.slug,
        avgRating: Number(r.diem_danh_gia_tb ?? 0),
        reviewCount: Number(r.so_luot_danh_gia ?? 0),
        variantId: r.phien_ban_id,
        price: Number(r.gia_ban),
        variantStatus: r.variant_status,
      })),
      total: Number(total),
      page,
      limit,
    };
  }

  async suggestions(q: string): Promise<SuggestionDto[]> {
    if (!q || q.trim().length < 2) return [];

    const rows = await this.dataSource.query(
      `SELECT sp.san_pham_id AS id, sp.ten_san_pham AS name, sp.Slug AS slug
       FROM san_pham sp
       WHERE sp.trang_thai = 'DangBan'
         AND MATCH(sp.ten_san_pham, sp.mo_ta_ngan) AGAINST(? IN BOOLEAN MODE)
       ORDER BY sp.diem_danh_gia_tb DESC
       LIMIT 10`,
      [`${q.trim()}*`],
    );
    return rows as SuggestionDto[];
  }

  async recordView(customerId: number, variantId: number): Promise<void> {
    // Upsert: update timestamp if already exists, otherwise insert
    await this.dataSource.query(
      `INSERT INTO product_view_history (khach_hang_id, phien_ban_id, thoi_diem_xem)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE thoi_diem_xem = NOW()`,
      [customerId, variantId],
    );
  }

  async getViewHistory(customerId: number): Promise<ViewHistoryItemDto[]> {
    const rows = await this.dataSource.query(
      `SELECT pvh.view_history_id AS id, pvh.phien_ban_id AS variantId,
              pvh.thoi_diem_xem AS viewedAt,
              v.ten_phien_ban AS variantName, v.gia_ban AS price,
              sp.ten_san_pham AS productName, sp.Slug AS slug
       FROM product_view_history pvh
       INNER JOIN phien_ban_san_pham v ON v.phien_ban_id = pvh.phien_ban_id
       INNER JOIN san_pham sp ON sp.san_pham_id = v.san_pham_id
       WHERE pvh.khach_hang_id = ?
       ORDER BY pvh.thoi_diem_xem DESC
       LIMIT 20`,
      [customerId],
    );
    return rows as ViewHistoryItemDto[];
  }
}
