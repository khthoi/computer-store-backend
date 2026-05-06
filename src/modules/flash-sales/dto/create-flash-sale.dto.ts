import {
  IsString, IsOptional, IsDate, IsArray, ValidateNested, IsInt, Min, IsNumber, MaxLength, IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FlashSaleStatus } from '../entities/flash-sale.entity';

export class CreateFlashSaleItemDto {
  @ApiProperty({ example: 12, description: 'ID phiên bản sản phẩm' })
  @IsInt() @Min(1)
  phienBanId: number;

  @ApiProperty({ example: 12990000, description: 'Giá flash sale (VND)' })
  @IsNumber()
  giaFlash: number;

  @ApiProperty({ example: 50, description: 'Số lượng giới hạn bán trong sự kiện' })
  @IsInt() @Min(1)
  soLuongGioiHan: number;

  @ApiPropertyOptional({ example: 1, description: 'Thứ tự hiển thị' })
  @IsOptional() @IsInt() @Min(1)
  thuTuHienThi?: number;
}

export class CreateFlashSaleDto {
  @ApiProperty({ example: 'Flash Sale Laptop Gaming T5/2026' })
  @IsString() @MaxLength(300)
  ten: string;

  @ApiPropertyOptional({ example: 'Ưu đãi cực sốc dịp 30/4' })
  @IsOptional() @IsString()
  moTa?: string;

  @ApiProperty({ example: '2026-05-01T10:00:00Z' })
  @Type(() => Date) @IsDate()
  batDau: Date;

  @ApiProperty({ example: '2026-05-01T14:00:00Z' })
  @Type(() => Date) @IsDate()
  ketThuc: Date;

  @ApiPropertyOptional({ example: 'FLASH SALE 30/4 - Giảm đến 40%' })
  @IsOptional() @IsString() @MaxLength(500)
  bannerTitle?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/.../banner.jpg' })
  @IsOptional() @IsString() @MaxLength(500)
  bannerImageUrl?: string;

  @ApiPropertyOptional({ example: 'Banner Flash Sale tháng 5' })
  @IsOptional() @IsString() @MaxLength(500)
  bannerAlt?: string;

  @ApiPropertyOptional({ example: 42 })
  @IsOptional() @IsInt()
  assetIdBanner?: number;

  @ApiPropertyOptional({ enum: FlashSaleStatus, example: FlashSaleStatus.NHAP, description: 'Trạng thái ban đầu — chỉ nhap hoặc sap_dien_ra' })
  @IsOptional() @IsEnum([FlashSaleStatus.NHAP, FlashSaleStatus.SAP_DIEN_RA])
  trangThai?: FlashSaleStatus.NHAP | FlashSaleStatus.SAP_DIEN_RA;

  @ApiProperty({ type: [CreateFlashSaleItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateFlashSaleItemDto)
  items: CreateFlashSaleItemDto[];
}
