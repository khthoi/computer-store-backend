import { Type } from 'class-transformer';
import {
  IsInt, IsString, IsOptional, IsArray, ValidateNested,
  IsNumber, Min, MaxLength, IsNotEmpty, IsDateString, IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportReceiptItemDto {
  @ApiProperty()
  @IsInt()
  phienBanId: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  soLuongDuKien: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  donGiaNhap?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ghiChu?: string;
}

export class CreateImportReceiptDto {
  @ApiPropertyOptional({
    enum: ['NhapMua', 'NhapHoanTra', 'NhapBaoHanh'],
    default: 'NhapMua',
    description: 'NhapMua: mua từ NCC (bắt buộc nhaCungCapId). NhapHoanTra/NhapBaoHanh: hàng khách trả về (nhaCungCapId có thể null)',
  })
  @IsOptional()
  @IsEnum(['NhapMua', 'NhapHoanTra', 'NhapBaoHanh'])
  loaiPhieu?: 'NhapMua' | 'NhapHoanTra' | 'NhapBaoHanh';

  @ApiPropertyOptional({ description: 'Bắt buộc khi loaiPhieu = NhapMua. Không cần cho NhapHoanTra/NhapBaoHanh' })
  @IsOptional()
  @IsInt()
  nhaCungCapId?: number;

  @ApiPropertyOptional({ description: 'ID yêu cầu đổi/trả liên quan (dùng cho NhapHoanTra/NhapBaoHanh)' })
  @IsOptional()
  @IsInt()
  yeuCauDoiTraId?: number;

  @ApiPropertyOptional({ example: '2025-05-20' })
  @IsDateString()
  @IsOptional()
  ngayDuKien?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  ghiChu?: string;

  @ApiProperty({ type: [ImportReceiptItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportReceiptItemDto)
  items: ImportReceiptItemDto[];
}
