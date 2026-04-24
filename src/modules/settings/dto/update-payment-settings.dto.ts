import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePaymentSettingsDto {
  @ApiPropertyOptional({ example: 'true', description: 'Bật/tắt thanh toán COD' })
  @IsOptional()
  @IsIn(['true', 'false'])
  cod_enabled?: string;

  @ApiPropertyOptional({ example: 'true', description: 'Bật/tắt chuyển khoản ngân hàng' })
  @IsOptional()
  @IsIn(['true', 'false'])
  bank_transfer_enabled?: string;

  @ApiPropertyOptional({ example: 'COMPUTERSTORE', description: 'VNPay Terminal Code (TMN Code)' })
  @IsOptional()
  @IsString()
  vnpay_tmn_code?: string;

  @ApiPropertyOptional({ example: 'true', description: 'Bật/tắt VNPay' })
  @IsOptional()
  @IsIn(['true', 'false'])
  vnpay_enabled?: string;

  @ApiPropertyOptional({ description: 'VNPay Hash Secret (mã hóa khi lưu)' })
  @IsOptional()
  @IsString()
  vnpay_hash_secret?: string;

  @ApiPropertyOptional({ example: 'COMPUTERSTOREPARTNER', description: 'MoMo Partner Code' })
  @IsOptional()
  @IsString()
  momo_partner_code?: string;

  @ApiPropertyOptional({ example: 'true', description: 'Bật/tắt MoMo' })
  @IsOptional()
  @IsIn(['true', 'false'])
  momo_enabled?: string;

  @ApiPropertyOptional({ description: 'MoMo Access Key' })
  @IsOptional()
  @IsString()
  momo_access_key?: string;
}
