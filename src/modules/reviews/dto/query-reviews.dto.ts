import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryReviewsDto {
  @ApiPropertyOptional({ example: 'Pending', enum: ['Pending', 'Approved', 'Rejected', 'Hidden'] })
  @IsOptional()
  @IsString()
  @IsIn(['Pending', 'Approved', 'Rejected', 'Hidden'])
  status?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  variantId?: number;

  @ApiPropertyOptional({ example: 4, enum: [1, 2, 3, 4, 5] })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ example: 'laptop' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  chuaTraLoi?: boolean;

  @ApiPropertyOptional({ example: 'Website', enum: ['Website', 'App', 'Import'] })
  @IsOptional()
  @IsString()
  @IsIn(['Website', 'App', 'Import'])
  nguon?: string;

  @ApiPropertyOptional({ example: true, description: 'Chỉ trả đánh giá có ảnh đính kèm' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasImages?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
