import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const PAGE_TYPES = [
  'chinh_sach_bao_mat', 'dieu_khoan_su_dung', 'chinh_sach_giao_hang',
  'chinh_sach_hoan_tien', 'chinh_sach_bao_hanh', 'huong_dan_mua_hang',
  'gioi_thieu', 'lien_he', 'custom',
] as const;

const PAGE_STATUSES = ['nhap', 'da_xuat_ban', 'an'] as const;

export class CreatePageDto {
  @ApiProperty({ enum: PAGE_TYPES })
  @IsEnum(PAGE_TYPES)
  type: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  slug: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ enum: PAGE_STATUSES })
  @IsOptional()
  @IsEnum(PAGE_STATUSES)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showInFooter?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  metaDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
