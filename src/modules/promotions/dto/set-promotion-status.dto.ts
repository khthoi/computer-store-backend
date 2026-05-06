import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PromotionStatus } from '../entities/promotion.entity';

export class SetPromotionStatusDto {
  @ApiProperty({ enum: PromotionStatus, example: PromotionStatus.ACTIVE })
  @IsEnum(PromotionStatus)
  status: PromotionStatus;
}
