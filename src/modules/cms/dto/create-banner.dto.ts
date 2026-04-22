import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsDateString,
  IsEnum,
  Min,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const BANNER_POSITIONS = ['TrangChu', 'TrangDanhMuc', 'TrangSanPham', 'DauTrang', 'CuaTrang', 'Popup', 'SideBanner'] as const;
const BANNER_STATUSES = ['DangHienThi', 'An', 'HetHan'] as const;

export class CreateBannerDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subtitle?: string;

  @ApiPropertyOptional({ description: 'ID asset từ media library (bắt buộc nếu không có imageUrl)' })
  @ValidateIf((o) => !o.imageUrl)
  @IsInt()
  @Min(1)
  @Type(() => Number)
  assetId?: number;

  @ApiPropertyOptional({ description: 'URL ảnh trực tiếp (bắt buộc nếu không có assetId)' })
  @ValidateIf((o) => !o.assetId)
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  assetIdMobile?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrlMobile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  overlayColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  overlayOpacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  targetUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buttonText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  buttonUrl?: string;

  @ApiProperty({ enum: BANNER_POSITIONS })
  @IsEnum(BANNER_POSITIONS)
  position: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({ enum: BANNER_STATUSES })
  @IsOptional()
  @IsEnum(BANNER_STATUSES)
  status?: string;
}
