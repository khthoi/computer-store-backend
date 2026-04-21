import { IsInt, IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustPointsDto {
  @ApiProperty({ example: 5, description: 'ID khách hàng' })
  @IsInt()
  khachHangId: number;

  @ApiProperty({ example: 100, description: 'Số điểm thay đổi (dương = cộng, âm = trừ)' })
  @IsInt()
  diem: number;

  @ApiProperty({ example: 'Bù điểm do sự cố hệ thống' })
  @IsString() @MaxLength(500)
  moTa: string;

  @ApiPropertyOptional({ enum: ['don_hang', 'loyalty_redemption', 'admin_adjust'], example: 'admin_adjust' })
  @IsOptional() @IsEnum(['don_hang', 'loyalty_redemption', 'admin_adjust'])
  loaiThamChieu?: 'don_hang' | 'loyalty_redemption' | 'admin_adjust';

  @ApiPropertyOptional({ example: 42 })
  @IsOptional() @IsInt()
  thamChieuId?: number;
}
