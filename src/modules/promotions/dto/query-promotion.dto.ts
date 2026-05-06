import { IsOptional, IsEnum, IsString, IsInt, Min, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
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

  @ApiPropertyOptional({ example: true, description: 'true = chỉ coupon, false = chỉ auto-apply, omit = tất cả' })
  @IsOptional() @Transform(({ value, obj, key }) => { const raw = obj[key]; if (raw === 'true' || raw === true) return true; if (raw === 'false' || raw === false) return false; return value; }) @IsBoolean()
  isCoupon?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number;

  @ApiPropertyOptional({ example: 'startDate', enum: ['name', 'type', 'status', 'priority', 'startDate', 'endDate', 'usageCount', 'createdAt'] })
  @IsOptional() @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ example: 'desc', enum: ['asc', 'desc'] })
  @IsOptional() @IsString()
  sortOrder?: 'asc' | 'desc';
}
