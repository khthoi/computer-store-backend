import { IsInt, IsNotEmpty, IsString, IsIn, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustStockDto {
  @ApiProperty()
  @IsInt()
  phienBanId: number;

  @ApiProperty({ description: 'Số dương = nhập thêm, số âm = giảm bớt' })
  @IsInt()
  soLuong: number;

  @ApiProperty({ enum: ['Nhap', 'Xuat', 'Huy'], description: 'Nhap = nhập bù, Xuat = xuất điều chỉnh, Huy = huỷ hàng hỏng (FIFO)' })
  @IsIn(['Nhap', 'Xuat', 'Huy'])
  loaiGiaoDich: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ghiChu?: string;
}
