import { IsOptional, IsString, IsInt, IsIn, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
}
