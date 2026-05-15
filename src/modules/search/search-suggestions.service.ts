import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  QuickSuggestionBrandDto,
  QuickSuggestionCategoryDto,
  QuickSuggestionProductDto,
  QuickSuggestionResponseDto,
  QuickSuggestionVariantDto,
  QuickSuggestionVariantStandaloneDto,
} from './dto/search-response.dto';

const MIN_QUERY_LEN = 2;

const PRODUCT_LIMIT = 6;
const VARIANT_LIMIT = 4;
const BRAND_LIMIT = 3;
const CATEGORY_LIMIT = 3;
const TOP_VARIANTS_PER_PRODUCT = 3;
const DEFAULT_VARIANT_LOOKUP_LIMIT = 10;
const MAX_TOKENS = 6;

interface ProductRow {
  id: number;
  name: string;
  slug: string;
  brand_name: string | null;
  category_name: string | null;
  variant_count: number | string;
  thumbnail_url: string | null;
}

interface VariantRow {
  variant_id: number;
  product_id: number;
  name: string;
  price: string;
  sku: string;
  status: string;
  media_url: string | null;
}

interface VariantWithProductRow extends VariantRow {
  product_name: string;
  product_slug: string;
}

interface BrandRow {
  id: number;
  name: string;
  slug: string | null;
  logo_url: string | null;
}

interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  icon_url: string | null;
}

interface TotalRow {
  total: number | string;
}

interface TokenClause {
  /** SQL fragment with `?` placeholders for the given columns. */
  fragment: string;
  /** One `%token%` value per column placeholder, repeated per token. */
  params: string[];
}

function emptyResponse(query: string): QuickSuggestionResponseDto {
  return {
    query,
    products: [],
    variants: [],
    brands: [],
    categories: [],
    totalProductMatches: 0,
    totalVariantMatches: 0,
    totalBrandMatches: 0,
    totalCategoryMatches: 0,
  };
}

/**
 * Split user query into whitespace tokens, dedupe, cap.
 * Each token will be required (AND) but each token is matched across any of
 * the listed columns (OR within the token).
 */
function tokenize(q: string): string[] {
  return Array.from(
    new Set(
      q
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    ),
  ).slice(0, MAX_TOKENS);
}

function buildTokenClause(tokens: string[], columns: string[]): TokenClause {
  if (tokens.length === 0 || columns.length === 0) {
    return { fragment: '1=1', params: [] };
  }
  const params: string[] = [];
  const perTokenFragments = tokens.map((token) => {
    const like = `%${token}%`;
    return (
      '(' +
      columns
        .map((col) => {
          params.push(like);
          return `${col} LIKE ?`;
        })
        .join(' OR ') +
      ')'
    );
  });
  return { fragment: perTokenFragments.join(' AND '), params };
}

@Injectable()
export class SearchSuggestionsService {
  constructor(private readonly dataSource: DataSource) {}

  async quickSuggestions(rawQuery: string): Promise<QuickSuggestionResponseDto> {
    const q = (rawQuery ?? '').trim();
    if (q.length < MIN_QUERY_LEN) return emptyResponse(q);

    const tokens = tokenize(q);
    if (tokens.length === 0) return emptyResponse(q);

    const productClause = buildTokenClause(tokens, [
      'sp.ten_san_pham',
      "COALESCE(sp.mo_ta_ngan, '')",
    ]);
    const variantClause = buildTokenClause(tokens, [
      'v.ten_phien_ban',
      'v.sku',
      'sp.ten_san_pham',
    ]);
    const brandClause = buildTokenClause(tokens, [
      'ten_thuong_hieu',
      "COALESCE(slug, '')",
    ]);
    const categoryClause = buildTokenClause(tokens, ['ten_danh_muc', 'slug']);

    const prefixLike = `${q}%`;

    const [
      products,
      variants,
      brands,
      categories,
      productTotalRow,
      variantTotalRow,
      brandTotalRow,
      categoryTotalRow,
    ] = await Promise.all([
      this.dataSource.query<ProductRow[]>(
        `SELECT
            sp.san_pham_id AS id,
            sp.ten_san_pham AS name,
            sp.slug AS slug,
            (SELECT MIN(th.ten_thuong_hieu)
               FROM san_pham_thuong_hieu spth
               INNER JOIN thuong_hieu th ON th.thuong_hieu_id = spth.thuong_hieu_id
               WHERE spth.san_pham_id = sp.san_pham_id) AS brand_name,
            dm.ten_danh_muc AS category_name,
            (SELECT COUNT(*) FROM phien_ban_san_pham _v WHERE _v.san_pham_id = sp.san_pham_id) AS variant_count,
            (SELECT _h.url_hinh_anh
               FROM phien_ban_san_pham _v
               LEFT JOIN hinh_anh_san_pham _h ON _h.phien_ban_id = _v.phien_ban_id
               WHERE _v.san_pham_id = sp.san_pham_id
                 AND _h.url_hinh_anh IS NOT NULL
               ORDER BY _v.is_mac_dinh DESC,
                        FIELD(_h.loai_anh, 'AnhChinh', 'AnhPhu') ASC,
                        _h.thu_tu ASC
               LIMIT 1) AS thumbnail_url
         FROM san_pham sp
         LEFT JOIN danh_muc dm ON dm.danh_muc_id = sp.danh_muc_id
         WHERE sp.trang_thai = 'DangBan'
           AND ${productClause.fragment}
         ORDER BY sp.diem_danh_gia_tb DESC, sp.ngay_cap_nhat DESC
         LIMIT ${PRODUCT_LIMIT}`,
        productClause.params,
      ),
      this.dataSource.query<VariantWithProductRow[]>(
        `SELECT
            v.phien_ban_id AS variant_id,
            v.san_pham_id AS product_id,
            v.ten_phien_ban AS name,
            v.gia_ban AS price,
            v.sku AS sku,
            v.trang_thai AS status,
            sp.ten_san_pham AS product_name,
            sp.slug AS product_slug,
            (SELECT _h.url_hinh_anh
               FROM hinh_anh_san_pham _h
               WHERE _h.phien_ban_id = v.phien_ban_id
                 AND _h.url_hinh_anh IS NOT NULL
               ORDER BY FIELD(_h.loai_anh, 'AnhChinh', 'AnhPhu') ASC, _h.thu_tu ASC
               LIMIT 1) AS media_url
         FROM phien_ban_san_pham v
         INNER JOIN san_pham sp ON sp.san_pham_id = v.san_pham_id
         WHERE sp.trang_thai = 'DangBan'
           AND v.trang_thai <> 'An'
           AND ${variantClause.fragment}
         ORDER BY v.is_mac_dinh DESC, v.phien_ban_id ASC
         LIMIT ${VARIANT_LIMIT}`,
        variantClause.params,
      ),
      this.dataSource.query<BrandRow[]>(
        `SELECT
            thuong_hieu_id AS id,
            ten_thuong_hieu AS name,
            slug,
            logo AS logo_url
         FROM thuong_hieu
         WHERE trang_thai = 'HienThi'
           AND ${brandClause.fragment}
         ORDER BY CASE WHEN ten_thuong_hieu LIKE ? THEN 0 ELSE 1 END, ten_thuong_hieu ASC
         LIMIT ${BRAND_LIMIT}`,
        [...brandClause.params, prefixLike],
      ),
      this.dataSource.query<CategoryRow[]>(
        `SELECT
            danh_muc_id AS id,
            ten_danh_muc AS name,
            slug,
            hinh_anh AS icon_url
         FROM danh_muc
         WHERE trang_thai = 'Hien'
           AND node_type <> 'label'
           AND ${categoryClause.fragment}
         ORDER BY CASE WHEN ten_danh_muc LIKE ? THEN 0 ELSE 1 END, thu_tu_hien_thi ASC, ten_danh_muc ASC
         LIMIT ${CATEGORY_LIMIT}`,
        [...categoryClause.params, prefixLike],
      ),
      this.dataSource.query<TotalRow[]>(
        `SELECT COUNT(*) AS total
           FROM san_pham sp
           WHERE sp.trang_thai = 'DangBan'
             AND ${productClause.fragment}`,
        productClause.params,
      ),
      this.dataSource.query<TotalRow[]>(
        `SELECT COUNT(*) AS total
           FROM phien_ban_san_pham v
           INNER JOIN san_pham sp ON sp.san_pham_id = v.san_pham_id
           WHERE sp.trang_thai = 'DangBan'
             AND v.trang_thai <> 'An'
             AND ${variantClause.fragment}`,
        variantClause.params,
      ),
      this.dataSource.query<TotalRow[]>(
        `SELECT COUNT(*) AS total
           FROM thuong_hieu
           WHERE trang_thai = 'HienThi'
             AND ${brandClause.fragment}`,
        brandClause.params,
      ),
      this.dataSource.query<TotalRow[]>(
        `SELECT COUNT(*) AS total
           FROM danh_muc
           WHERE trang_thai = 'Hien'
             AND node_type <> 'label'
             AND ${categoryClause.fragment}`,
        categoryClause.params,
      ),
    ]);

    const productIds = products.map((row) => row.id);
    const topVariantsByProduct = productIds.length > 0
      ? await this.fetchTopVariantsByProducts(productIds)
      : new Map<number, QuickSuggestionVariantDto[]>();

    const productDtos: QuickSuggestionProductDto[] = products.map((row) => ({
      id: Number(row.id),
      name: row.name,
      slug: row.slug,
      thumbnailUrl: row.thumbnail_url ?? null,
      brandName: row.brand_name ?? '',
      categoryName: row.category_name ?? '',
      variantCount: Number(row.variant_count ?? 0),
      topVariants: topVariantsByProduct.get(Number(row.id)) ?? [],
    }));

    const variantDtos: QuickSuggestionVariantStandaloneDto[] = variants.map((row) => ({
      variantId: Number(row.variant_id),
      productId: Number(row.product_id),
      productName: row.product_name,
      productSlug: row.product_slug,
      name: row.name,
      price: Number(row.price),
      sku: row.sku,
      status: row.status,
      mediaUrl: row.media_url ?? null,
    }));

    const brandDtos: QuickSuggestionBrandDto[] = brands.map((row) => ({
      id: Number(row.id),
      name: row.name,
      slug: row.slug ?? '',
      logoUrl: row.logo_url ?? null,
    }));

    const categoryDtos: QuickSuggestionCategoryDto[] = categories.map((row) => ({
      id: Number(row.id),
      name: row.name,
      slug: row.slug,
      iconUrl: row.icon_url ?? null,
    }));

    const totalOf = (rows: TotalRow[]): number =>
      rows.length > 0 ? Number(rows[0].total ?? 0) : 0;

    return {
      query: q,
      products: productDtos,
      variants: variantDtos,
      brands: brandDtos,
      categories: categoryDtos,
      totalProductMatches: totalOf(productTotalRow),
      totalVariantMatches: totalOf(variantTotalRow),
      totalBrandMatches: totalOf(brandTotalRow),
      totalCategoryMatches: totalOf(categoryTotalRow),
    };
  }

  async getProductVariants(
    productId: number,
    limit = DEFAULT_VARIANT_LOOKUP_LIMIT,
  ): Promise<QuickSuggestionVariantDto[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const rows = await this.dataSource.query<VariantRow[]>(
      `SELECT
          v.phien_ban_id AS variant_id,
          v.san_pham_id AS product_id,
          v.ten_phien_ban AS name,
          v.gia_ban AS price,
          v.sku AS sku,
          v.trang_thai AS status,
          (SELECT _h.url_hinh_anh
             FROM hinh_anh_san_pham _h
             WHERE _h.phien_ban_id = v.phien_ban_id
               AND _h.url_hinh_anh IS NOT NULL
             ORDER BY FIELD(_h.loai_anh, 'AnhChinh', 'AnhPhu') ASC, _h.thu_tu ASC
             LIMIT 1) AS media_url
       FROM phien_ban_san_pham v
       WHERE v.san_pham_id = ?
         AND v.trang_thai <> 'An'
       ORDER BY v.is_mac_dinh DESC, v.phien_ban_id ASC
       LIMIT ${safeLimit}`,
      [productId],
    );

    return rows.map((row) => this.mapVariantRow(row));
  }

  private async fetchTopVariantsByProducts(
    productIds: number[],
  ): Promise<Map<number, QuickSuggestionVariantDto[]>> {
    const rows = await this.dataSource.query<VariantRow[]>(
      `SELECT
          v.phien_ban_id AS variant_id,
          v.san_pham_id AS product_id,
          v.ten_phien_ban AS name,
          v.gia_ban AS price,
          v.sku AS sku,
          v.trang_thai AS status,
          (SELECT _h.url_hinh_anh
             FROM hinh_anh_san_pham _h
             WHERE _h.phien_ban_id = v.phien_ban_id
               AND _h.url_hinh_anh IS NOT NULL
             ORDER BY FIELD(_h.loai_anh, 'AnhChinh', 'AnhPhu') ASC, _h.thu_tu ASC
             LIMIT 1) AS media_url
       FROM phien_ban_san_pham v
       WHERE v.san_pham_id IN (?)
         AND v.trang_thai <> 'An'
       ORDER BY v.san_pham_id ASC, v.is_mac_dinh DESC, v.phien_ban_id ASC`,
      [productIds],
    );

    const grouped = new Map<number, QuickSuggestionVariantDto[]>();
    for (const row of rows) {
      const pid = Number(row.product_id);
      const list = grouped.get(pid) ?? [];
      if (list.length < TOP_VARIANTS_PER_PRODUCT) {
        list.push(this.mapVariantRow(row));
        grouped.set(pid, list);
      }
    }
    return grouped;
  }

  private mapVariantRow(row: VariantRow): QuickSuggestionVariantDto {
    return {
      variantId: Number(row.variant_id),
      name: row.name,
      price: Number(row.price),
      sku: row.sku,
      status: row.status,
      mediaUrl: row.media_url ?? null,
    };
  }
}
