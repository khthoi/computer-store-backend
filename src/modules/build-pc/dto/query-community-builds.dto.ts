import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export type CommunityBuildSortKey =
  | 'newest'
  | 'views'
  | 'clones'
  | 'price-asc'
  | 'price-desc';

export class QueryCommunityBuildsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 12;

  @ApiPropertyOptional({ description: 'Tìm theo tên build / mô tả' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['newest', 'views', 'clones', 'price-asc', 'price-desc'],
    default: 'newest',
  })
  @IsOptional()
  @IsEnum(['newest', 'views', 'clones', 'price-asc', 'price-desc'])
  sortBy?: CommunityBuildSortKey = 'newest';
}
