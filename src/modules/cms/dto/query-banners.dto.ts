import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

const BANNER_POSITIONS = ['TrangChu', 'TrangDanhMuc', 'TrangSanPham', 'DauTrang', 'CuaTrang', 'Popup', 'SideBanner'] as const;
const BANNER_STATUSES = ['DangHienThi', 'An', 'HetHan'] as const;

export class QueryBannersDto {
  @ApiPropertyOptional({ enum: BANNER_POSITIONS })
  @IsOptional()
  @IsEnum(BANNER_POSITIONS)
  position?: string;

  @ApiPropertyOptional({ enum: BANNER_STATUSES })
  @IsOptional()
  @IsEnum(BANNER_STATUSES)
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}
