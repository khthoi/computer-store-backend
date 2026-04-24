import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryRfmDto {
  @ApiPropertyOptional({
    example: 'Champions',
    description: 'Lọc theo segment: Champions, Loyal, At Risk, Lost, New, Promising, Hibernating',
  })
  @IsOptional()
  @IsString()
  segment?: string;

  @ApiPropertyOptional({ example: 1, description: 'Trang hiện tại' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Số bản ghi / trang' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
