import { IsOptional, IsString, IsInt, IsIn, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryProductDto extends PaginationDto {
  /** Alias for PaginationDto.search — frontend sends ?q= */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  /** Filter by category name (frontend sends the display name, not ID) */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  brandId?: number;

  /**
   * Multi-brand filter — OR-matches any of the supplied brand IDs.
   * Send as repeated query param: `?brandIds=1&brandIds=2`.
   */
  @ApiPropertyOptional({ isArray: true, type: Number })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : (Array.isArray(value) ? value : [value])
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n) && n > 0),
  )
  brandIds?: number[];

  /** Backend-native status filter */
  @ApiPropertyOptional({ enum: ['DangBan', 'NgungBan', 'Nhap'] })
  @IsOptional()
  @IsIn(['DangBan', 'NgungBan', 'Nhap'])
  trangThai?: string;

  /** Frontend-facing status filter — mapped to trangThai by the service */
  @ApiPropertyOptional({ enum: ['published', 'draft', 'archived'] })
  @IsOptional()
  @IsIn(['published', 'draft', 'archived'])
  status?: 'published' | 'draft' | 'archived';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  /** Alias for PaginationDto.limit — admin tables may request up to 1 000 rows */
  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  pageSize?: number;

  /** Storefront filter — only products with at least one variant in stock */
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  inStock?: boolean;

  /**
   * Storefront filter — only products currently on sale: either
   * (a) a variant has a static markdown (`gia_ban < gia_goc`), or
   * (b) a variant is included in a flash sale that is `status='active'`
   *     AND its `[batDau, ketThuc]` window covers NOW.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  onSale?: boolean;

  /** Storefront filter — minimum average rating (1..5) */
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  ratingMin?: number;

  /**
   * Storefront facet filters. Each entry is `<specTypeId>:<spec>` where `<spec>` is one of:
   * - `<v1>,<v2>` — multi-select / checkbox values (matched against giaTriChuan ?? giaTriThongSo)
   * - `<min>..<max>` — numeric range (matched against giaTriSo)
   * - `true` — toggle on (any non-empty value)
   * Send as repeated query param: `?specs=1:rtx-4070,rtx-4080&specs=2:8..16`.
   */
  @ApiPropertyOptional({ isArray: true, type: String })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : Array.isArray(value)
        ? value.map(String)
        : [String(value)],
  )
  specs?: string[];
}
