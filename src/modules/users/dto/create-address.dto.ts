import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional, IsBoolean } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @MaxLength(255)
  hoTenNguoiNhan: string;

  @ApiProperty({ example: '0901234567' })
  @IsString()
  @MaxLength(20)
  soDienThoaiNhan: string;

  @ApiProperty({ example: '123 Lê Lợi, Phường Bến Nghé' })
  @IsString()
  @MaxLength(500)
  diaChiChiTiet: string;

  @ApiProperty({ example: 'Quận 1' })
  @IsString()
  @MaxLength(200)
  quanHuyen: string;

  @ApiProperty({ example: 'TP. Hồ Chí Minh' })
  @IsString()
  @MaxLength(200)
  tinhThanhPho: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  laMacDinh?: boolean;
}
