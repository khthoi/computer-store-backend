import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsIn,
  IsArray,
  ValidateNested,
  IsNumber,
  IsBoolean,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateVariantDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  tenPhienBan: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sku: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  giaGoc: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  giaBan: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  trongLuong?: number;

  @ApiPropertyOptional({ enum: ['HienThi', 'An', 'HetHang'], default: 'HienThi' })
  @IsOptional()
  @IsIn(['HienThi', 'An', 'HetHang'])
  trangThai?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  moTaChiTiet?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  chinhSachBaoHanh?: string;

  @ApiPropertyOptional({ description: 'Đặt làm phiên bản mặc định hiển thị trên listing/card' })
  @IsOptional()
  @IsBoolean()
  isMacDinh?: boolean;
}

export class CreateProductDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  danhMucId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  maSanPham: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  tenSanPham: string;

  @ApiPropertyOptional({ description: 'Để trống → tự tạo từ tên' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  moTaNgan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  moTaChiTiet?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  chinhSachBaoHanh?: string;

  @ApiPropertyOptional({ enum: ['DangBan', 'NgungBan', 'Nhap'], default: 'Nhap' })
  @IsOptional()
  @IsIn(['DangBan', 'NgungBan', 'Nhap'])
  trangThai?: string;

  @ApiPropertyOptional({ type: [CreateVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];

  @ApiPropertyOptional({ description: 'Danh sách thuong_hieu_id' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  brandIds?: number[];
}
