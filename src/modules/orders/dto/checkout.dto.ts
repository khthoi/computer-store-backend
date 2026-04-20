import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { PhuongThucVanChuyen } from '../entities/order.entity';

export enum PhuongThucThanhToan {
  COD = 'COD',
  VNPAY = 'VNPay',
  MOMO = 'MoMo',
}

export class CheckoutDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  diaChiGiaoHangId: number;

  @ApiProperty({ enum: PhuongThucVanChuyen })
  @IsEnum(PhuongThucVanChuyen)
  phuongThucVanChuyen: PhuongThucVanChuyen;

  @ApiProperty({ enum: PhuongThucThanhToan })
  @IsEnum(PhuongThucThanhToan)
  phuongThucThanhToan: PhuongThucThanhToan;

  @ApiPropertyOptional({ example: 'SALE10' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  couponCode?: string;

  @ApiPropertyOptional({ example: 'Giao buổi sáng' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  ghiChuKhach?: string;
}
