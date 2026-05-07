import { IsOptional, IsString, IsArray, IsEnum, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { BANNER_POSITIONS, BANNER_STATUSES } from './create-banner.dto';

export class QueryBannersDto {
  @ApiPropertyOptional({ description: 'Tìm kiếm theo tiêu đề' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: BANNER_POSITIONS, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(BANNER_POSITIONS, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  position?: string[];

  @ApiPropertyOptional({ enum: BANNER_STATUSES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(BANNER_STATUSES, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  status?: string[];

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
