import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FlashSaleItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  flashSaleId: number;

  @ApiProperty({ example: 5 })
  variantId: number;

  @ApiProperty({ example: 9990000 })
  flashPrice: number;

  @ApiProperty({ example: 15000000 })
  originalPriceSnapshot: number;

  @ApiProperty({ example: 50 })
  quantityLimit: number;

  @ApiProperty({ example: 12 })
  quantitySold: number;

  @ApiProperty({ example: 1 })
  displayOrder: number;
}

export class FlashSaleResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Flash Sale 11/11' })
  name: string;

  @ApiPropertyOptional({ example: 'Giảm giá sốc ngày 11/11' })
  description: string | null;

  @ApiProperty({ example: 'nhap', enum: ['nhap', 'sap_dien_ra', 'dang_dien_ra', 'da_ket_thuc', 'huy'] })
  status: string;

  @ApiProperty({ example: '2024-11-11T00:00:00.000Z' })
  startAt: Date;

  @ApiProperty({ example: '2024-11-11T23:59:59.000Z' })
  endAt: Date;

  @ApiPropertyOptional({ example: 'Flash Sale Tháng 11' })
  bannerTitle: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/banner.jpg' })
  bannerImageUrl: string | null;

  @ApiPropertyOptional({ example: 42 })
  assetIdBanner: number | null;

  @ApiProperty({ example: 3 })
  createdBy: number;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ type: [FlashSaleItemResponseDto] })
  items: FlashSaleItemResponseDto[];
}
