import { IsInt, IsNotEmpty, IsString, IsIn, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustStockDto {
  @ApiProperty()
  @IsInt()
  phienBanId: number;

  @ApiProperty()
  @IsInt()
  khoId: number;

  @ApiProperty({ description: 'Số dương = nhập thêm, số âm = giảm bớt' })
  @IsInt()
  soLuong: number;

  @ApiProperty({ enum: ['Nhap', 'Xuat', 'HoanTra', 'Huy', 'DieuChinh'] })
  @IsIn(['Nhap', 'Xuat', 'HoanTra', 'Huy', 'DieuChinh'])
  loaiGiaoDich: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ghiChu?: string;
}
