import {
  IsOptional, IsArray, IsString, IsInt, Min, Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryAdminNotificationsDto {
  @ApiPropertyOptional({ type: [String], example: ['Email', 'Push'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  kenhGui?: string[];

  @ApiPropertyOptional({ type: [String], example: ['DaGui', 'ThatBai'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  trangThai?: string[];

  @ApiPropertyOptional({ type: [String], example: ['DonHang'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  loaiThongBao?: string[];

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsString()
  tuNgay?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsString()
  denNgay?: string;

  @ApiPropertyOptional({ example: 'Nguyen' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
