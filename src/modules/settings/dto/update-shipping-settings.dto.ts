import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateShippingSettingsDto {
  @ApiPropertyOptional({ example: '500000', description: 'Ngưỡng miễn phí vận chuyển (VNĐ)' })
  @IsOptional()
  @IsString()
  free_threshold?: string;

  @ApiPropertyOptional({ example: '30000', description: 'Phí vận chuyển tiêu chuẩn (VNĐ)' })
  @IsOptional()
  @IsString()
  standard_fee?: string;

  @ApiPropertyOptional({ example: '50000', description: 'Phí vận chuyển nhanh (VNĐ)' })
  @IsOptional()
  @IsString()
  express_fee?: string;

  @ApiPropertyOptional({ example: '80000', description: 'Phí giao trong ngày (VNĐ)' })
  @IsOptional()
  @IsString()
  same_day_fee?: string;

  @ApiPropertyOptional({ example: '7', description: 'Thời gian giao hàng tiêu chuẩn (ngày)' })
  @IsOptional()
  @IsString()
  standard_delivery_days?: string;

  @ApiPropertyOptional({ example: '2', description: 'Thời gian giao hàng nhanh (ngày)' })
  @IsOptional()
  @IsString()
  express_delivery_days?: string;
}
