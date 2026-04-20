import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TrangThaiDon } from '../entities/order.entity';

export class QueryOrderDto {
  @ApiPropertyOptional({ enum: TrangThaiDon })
  @IsOptional()
  @IsEnum(TrangThaiDon)
  trangThai?: TrangThaiDon;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
