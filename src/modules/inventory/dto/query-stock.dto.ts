import { IsOptional, IsInt, IsBoolean, IsString, IsIn, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryStockDto {
  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên sản phẩm hoặc SKU' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Chỉ lấy những phiên bản dưới ngưỡng cảnh báo' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  lowStockOnly?: boolean;

  @ApiPropertyOptional({ enum: ['ok', 'low_stock', 'out_of_stock_inv'] })
  @IsOptional()
  @IsIn(['ok', 'low_stock', 'out_of_stock_inv'])
  alertLevel?: 'ok' | 'low_stock' | 'out_of_stock_inv';

  @ApiPropertyOptional({ description: 'Lọc theo nhà cung cấp (ID)' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo danh mục (ID)' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    enum: ['productName', 'sku', 'quantityOnHand', 'lowStockThreshold', 'costPrice', 'sellingPrice', 'updatedAt'],
    default: 'updatedAt',
  })
  @IsOptional()
  @IsString()
  sortKey?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';

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
