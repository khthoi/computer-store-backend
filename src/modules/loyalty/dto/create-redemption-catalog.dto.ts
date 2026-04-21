import { IsString, IsInt, IsOptional, IsBoolean, IsDate, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRedemptionCatalogDto {
  @ApiProperty({ example: 'Mã giảm 50k cho đơn từ 2 triệu' })
  @IsString() @MaxLength(300)
  ten: string;

  @ApiPropertyOptional({ example: 'Áp dụng cho tất cả sản phẩm' })
  @IsOptional() @IsString()
  moTa?: string;

  @ApiProperty({ example: 500, description: 'Số điểm cần để đổi' })
  @IsInt() @Min(1)
  diemCan: number;

  @ApiProperty({ example: 3, description: 'ID promotion (is_coupon=true) liên kết' })
  @IsInt() @Min(1)
  promotionId: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional() @IsBoolean()
  laHoatDong?: boolean;

  @ApiPropertyOptional({ example: 100, description: 'null = không giới hạn số lượng' })
  @IsOptional() @IsInt() @Min(1)
  gioiHanTonKho?: number;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z' })
  @IsOptional() @Type(() => Date) @IsDate()
  hieuLucTu?: Date;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsOptional() @Type(() => Date) @IsDate()
  hieuLucDen?: Date;
}
