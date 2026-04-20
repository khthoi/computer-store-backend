import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TrangThaiDon } from '../entities/order.entity';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: TrangThaiDon })
  @IsEnum(TrangThaiDon)
  trangThai: TrangThaiDon;

  @ApiPropertyOptional({ example: 'Đơn hàng đã được đóng gói và giao cho vận chuyển' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  ghiChu?: string;
}
