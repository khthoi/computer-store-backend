import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FlashSaleItemResponseDto {
  @ApiProperty({ example: 1 })
  flashSaleItemId: number;

  @ApiProperty({ example: 1 })
  flashSaleId: number;

  @ApiProperty({ example: 5 })
  phienBanId: number;

  @ApiPropertyOptional({ example: 3 })
  sanPhamId?: number;

  @ApiProperty({ example: 'Intel Core i9-13900K' })
  tenPhienBan: string;

  @ApiProperty({ example: 'CPU-I9-13900K-001' })
  skuSnapshot: string;

  @ApiProperty({ example: 'Intel Core i9' })
  sanPhamTen: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/img.jpg' })
  hinhAnh?: string;

  @ApiProperty({ example: 9990000 })
  giaFlash: number;

  @ApiProperty({ example: 12990000 })
  giaGocSnapshot: number;

  @ApiPropertyOptional({ example: 15000000 })
  giaGoc?: number;

  @ApiProperty({ example: 50 })
  soLuongGioiHan: number;

  @ApiProperty({ example: 12 })
  soLuongDaBan: number;

  @ApiProperty({ example: 1 })
  thuTuHienThi: number;
}

export class FlashSaleResponseDto {
  @ApiProperty({ example: 1 })
  flashSaleId: number;

  @ApiProperty({ example: 'Flash Sale 11/11' })
  ten: string;

  @ApiPropertyOptional({ example: 'Giảm giá sốc ngày 11/11' })
  moTa?: string;

  @ApiProperty({ example: 'nhap', enum: ['nhap', 'sap_dien_ra', 'dang_dien_ra', 'da_ket_thuc', 'huy'] })
  trangThai: string;

  @ApiProperty({ example: '2024-11-11T00:00:00.000Z' })
  batDau: string;

  @ApiProperty({ example: '2024-11-11T23:59:59.000Z' })
  ketThuc: string;

  @ApiPropertyOptional({ example: 'Flash Sale Tháng 11' })
  bannerTitle?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/banner.jpg' })
  bannerImageUrl?: string;

  @ApiPropertyOptional({ example: 'Banner Flash Sale tháng 5' })
  bannerAlt?: string;

  @ApiProperty({ example: 3 })
  createdByEmployeeId: number;

  @ApiProperty({ example: 'Nguyễn Văn An' })
  createdBy: string;

  @ApiPropertyOptional({ example: 'an.nguyen@store.vn' })
  createdByEmail?: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: string;

  @ApiProperty({ type: [FlashSaleItemResponseDto] })
  items: FlashSaleItemResponseDto[];
}

export class FlashSaleSummaryResponseDto {
  @ApiProperty({ example: 1 })
  flashSaleId: number;

  @ApiProperty({ example: 'Flash Sale 11/11' })
  ten: string;

  @ApiProperty({ example: 'nhap', enum: ['nhap', 'sap_dien_ra', 'dang_dien_ra', 'da_ket_thuc', 'huy'] })
  trangThai: string;

  @ApiProperty({ example: '2024-11-11T00:00:00.000Z' })
  batDau: string;

  @ApiProperty({ example: '2024-11-11T23:59:59.000Z' })
  ketThuc: string;

  @ApiProperty({ example: 5 })
  soLuongPhienBan: number;

  @ApiProperty({ example: 30 })
  tongSanPhamDaBan: number;

  @ApiProperty({ example: 100 })
  tongGioiHan: number;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: string;
}

export class FlashSaleStatsResponseDto {
  @ApiProperty({ example: 10 })
  totalEvents: number;

  @ApiProperty({ example: 1 })
  activeNow: number;

  @ApiProperty({ example: 3 })
  upcomingCount: number;

  @ApiProperty({ example: 2 })
  todayCount: number;
}

export class VariantSearchResultResponseDto {
  @ApiProperty({ example: 5 })
  phienBanId: number;

  @ApiPropertyOptional({ example: 3 })
  sanPhamId?: number;

  @ApiProperty({ example: 'Intel Core i9-13900K' })
  tenPhienBan: string;

  @ApiProperty({ example: 'CPU-I9-13900K-001' })
  sku: string;

  @ApiProperty({ example: 'Intel Core i9' })
  sanPhamTen: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/img.jpg' })
  hinhAnh?: string;

  @ApiProperty({ example: 12990000 })
  giaBan: number;

  @ApiPropertyOptional({ example: 15000000 })
  giaGoc?: number;

  @ApiProperty({ example: 'HienThi' })
  trangThai: string;

  @ApiProperty({ example: 20 })
  tonKho: number;
}
