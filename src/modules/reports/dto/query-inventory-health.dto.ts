import { IsOptional, IsIn, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryInventoryHealthDto {
  @ApiPropertyOptional({
    enum: ['het_hang', 'thap', 'tot', 'ton_kho'],
    description: 'Lọc theo nhóm tình trạng kho',
  })
  @IsOptional()
  @IsIn(['het_hang', 'thap', 'tot', 'ton_kho'])
  bucket?: string;

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
