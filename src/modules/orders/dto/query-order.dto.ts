import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TrangThaiDon } from '../entities/order.entity';

export class QueryOrderDto {
  @ApiPropertyOptional({ description: 'Tìm theo mã đơn hàng' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: TrangThaiDon })
  @IsOptional()
  @IsEnum(TrangThaiDon)
  trangThai?: TrangThaiDon;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái thanh toán', example: 'ChuaThanhToan' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  trangThaiThanhToan?: string;

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

  @ApiPropertyOptional({ description: 'Sort field', example: 'createdAt' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort direction', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsString()
  @MaxLength(4)
  sortOrder?: string;
}
