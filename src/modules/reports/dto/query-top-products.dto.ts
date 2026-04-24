import { IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryTopProductsDto {
  @ApiPropertyOptional({
    enum: ['7d', '30d', '90d', '365d'],
    default: '30d',
    description: 'Khoảng thời gian thống kê',
  })
  @IsOptional()
  @IsIn(['7d', '30d', '90d', '365d'])
  period?: string = '30d';

  @ApiPropertyOptional({ example: 10, description: 'Số lượng sản phẩm trả về (tối đa 50)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
