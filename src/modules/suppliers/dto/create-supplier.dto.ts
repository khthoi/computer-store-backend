import { IsString, IsEmail, IsOptional, IsIn, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  tenNhaCungCap: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(20)
  soDienThoai?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  diaChi?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  nguoiLienHe?: string;

  @ApiPropertyOptional({ enum: ['DangHopTac', 'NgungHopTac'] })
  @IsIn(['DangHopTac', 'NgungHopTac'])
  @IsOptional()
  trangThai?: string;
}
