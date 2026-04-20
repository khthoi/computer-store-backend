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
}
