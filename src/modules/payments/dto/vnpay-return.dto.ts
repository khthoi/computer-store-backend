import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class VNPayReturnDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vnp_TxnRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vnp_ResponseCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vnp_TransactionNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vnp_Amount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vnp_BankCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vnp_SecureHash?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vnp_TransactionStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vnp_PayDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vnp_OrderInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vnp_CardType?: string;
}
