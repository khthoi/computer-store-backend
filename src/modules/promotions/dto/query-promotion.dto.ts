import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PromotionStatus, PromotionType } from '../entities/promotion.entity';

export class QueryPromotionDto {
  @ApiPropertyOptional({ enum: PromotionStatus, example: PromotionStatus.ACTIVE })
  @IsOptional() @IsEnum(PromotionStatus)
  status?: PromotionStatus;

  @ApiPropertyOptional({ enum: PromotionType, example: PromotionType.STANDARD })
  @IsOptional() @IsEnum(PromotionType)
  type?: PromotionType;

  @ApiPropertyOptional({ example: 'Giảm giá laptop' })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number;
}
