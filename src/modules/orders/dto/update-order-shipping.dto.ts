import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateOrderShippingDto {
  @ApiPropertyOptional({ example: 'GHN' })
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiPropertyOptional({ example: 'GHN123456789' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({ example: '2024-01-20' })
  @IsOptional()
  @IsDateString()
  estimatedDelivery?: string;
}
