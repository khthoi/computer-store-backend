import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
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
