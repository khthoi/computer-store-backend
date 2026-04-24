import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ example: 'true', description: 'Bật/tắt gửi email' })
  @IsOptional()
  @IsIn(['true', 'false'])
  email_enabled?: string;

  @ApiPropertyOptional({ example: 'noreply@computerstore.vn', description: 'Email gửi đi (from address)' })
  @IsOptional()
  @IsString()
  email_from?: string;

  @ApiPropertyOptional({ example: 'Computer Store', description: 'Tên hiển thị khi gửi email' })
  @IsOptional()
  @IsString()
  email_from_name?: string;

  @ApiPropertyOptional({ example: '5', description: 'Ngưỡng tồn kho thấp để cảnh báo' })
  @IsOptional()
  @IsString()
  low_stock_threshold?: string;

  @ApiPropertyOptional({ example: '30', description: 'Thời hạn đổi/trả hàng sau giao (ngày)' })
  @IsOptional()
  @IsString()
  return_window_days?: string;

  @ApiPropertyOptional({ example: '24', description: 'SLA ticket ưu tiên cao (giờ)' })
  @IsOptional()
  @IsString()
  sla_high_priority_hours?: string;

  @ApiPropertyOptional({ example: '72', description: 'SLA ticket ưu tiên thường (giờ)' })
  @IsOptional()
  @IsString()
  sla_normal_priority_hours?: string;
}
