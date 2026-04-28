import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SettleRefundDto {
  @ApiProperty({ example: '14032024_1234567890', description: 'Mã giao dịch hoàn từ gateway (VNPay TransactionNo, MoMo transId…)' })
  @IsString()
  @MaxLength(255)
  externalRef: string;

  @ApiPropertyOptional({ example: 'Techcombank', description: 'Ngân hàng/ví đã xử lý hoàn' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bank?: string;

  @ApiPropertyOptional({ example: '2024-03-14T08:30:00.000Z', description: 'Thời điểm tiền thực sự về phía khách (ISO 8601)' })
  @IsOptional()
  @IsString()
  settledAt?: string;

  @ApiPropertyOptional({ example: 'Đã xác nhận với gateway lúc 8:30 sáng' })
  @IsOptional()
  @IsString()
  note?: string;
}
