import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReturnAssetResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 5 })
  returnRequestId: number;

  @ApiProperty({ example: 42 })
  assetId: number;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/demo/image/upload/sample.jpg' })
  assetUrl?: string;

  @ApiProperty({ example: 'customer_evidence', enum: ['customer_evidence', 'inspection_evidence'] })
  loaiAsset: string;
}

export class ReturnRequestResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 8 })
  orderId: number;

  @ApiProperty({ example: 12 })
  customerId: number;

  @ApiProperty({ example: 'TraHang', enum: ['DoiHang', 'TraHang', 'BaoHanh'] })
  requestType: string;

  @ApiProperty({
    example: 'LoiNhaSanXuat',
    enum: ['LoiNhaSanXuat','GuiNhamHang','HuHongKhiVanChuyen','ThieuPhuKien','KhongDungMoTa','DoiYKien','KhongTuongThich','HieuNangKemHon'],
  })
  reason: string;

  @ApiPropertyOptional({ example: 'Màn hình bị sọc sau khi mở hộp' })
  description: string | null;

  @ApiProperty({ example: 'ChoDuyet', enum: ['ChoDuyet', 'DaDuyet', 'TuChoi', 'DaNhanHang', 'DaKiemTra', 'DangXuLy', 'HoanThanh'] })
  status: string;

  @ApiPropertyOptional({ example: 3 })
  processedById: number | null;

  @ApiPropertyOptional({ example: 'HangDapKhiKiemTra' })
  inspectionResult: string | null;

  @ApiPropertyOptional({ example: 'HoanTien', enum: ['GiaoHangMoi', 'HoanTien', 'BaoHanh'] })
  resolution: string | null;

  @ApiPropertyOptional({ example: 'GHTK-RET-2025-001' })
  returnTrackingCode: string | null;

  @ApiPropertyOptional({ example: 'GHTK' })
  returnCarrier: string | null;

  @ApiPropertyOptional({ example: '2024-06-05T14:30:00.000Z' })
  returnReceivedAt: Date | null;

  @ApiPropertyOptional({ example: 5 })
  returnReceivedById: number | null;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;
}
