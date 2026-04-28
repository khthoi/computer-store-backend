import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsIn,
  IsObject,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  tenDanhMuc: string;

  @ApiPropertyOptional({ description: 'Để trống → tự tạo từ tên' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;

  @ApiPropertyOptional({ enum: ['category', 'filter', 'label'], default: 'category' })
  @IsOptional()
  @IsIn(['category', 'filter', 'label'])
  nodeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  filterParams?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  danhMucChaId?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  thuTuHienThi?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  hinhAnh?: string;

  @ApiPropertyOptional({ enum: ['Hien', 'An'], default: 'Hien' })
  @IsOptional()
  @IsIn(['Hien', 'An'])
  trangThai?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  moTa?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  badgeText?: string;

  @ApiPropertyOptional({ description: 'Hex color, e.g. #ef4444' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  badgeBg?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  badgeFg?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assetId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  imageAlt?: string;
}
