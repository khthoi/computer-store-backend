import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FlashSaleStatus } from '../entities/flash-sale.entity';

export class QueryFlashSaleDto {
  @ApiPropertyOptional({ enum: FlashSaleStatus, example: FlashSaleStatus.DANG_DIEN_RA })
  @IsOptional() @IsEnum(FlashSaleStatus)
  status?: FlashSaleStatus;

  @ApiPropertyOptional({ example: 'Flash Sale 11/11' })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number;
}
