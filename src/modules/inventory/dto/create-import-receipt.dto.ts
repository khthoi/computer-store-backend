import { Type } from 'class-transformer';
import {
  IsInt, IsString, IsOptional, IsArray, ValidateNested,
  IsNumber, Min, MaxLength, IsNotEmpty, IsDateString,
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
  @ApiProperty()
  @IsInt()
  nhaCungCapId: number;

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
