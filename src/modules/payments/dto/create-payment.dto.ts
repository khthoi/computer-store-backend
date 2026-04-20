import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { PhuongThucThanhToan } from '../entities/transaction.entity';

export class CreatePaymentDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  donHangId: number;

  @ApiProperty({ enum: PhuongThucThanhToan })
  @IsEnum(PhuongThucThanhToan)
  phuongThucThanhToan: PhuongThucThanhToan;

  @ApiPropertyOptional({ example: 'Vietcombank' })
  @IsOptional()
  @IsString()
  nganHangVi?: string;
}
