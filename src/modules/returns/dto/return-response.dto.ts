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

  @ApiProperty({ example: 'HangLoi' })
  reason: string;

  @ApiPropertyOptional({ example: 'Màn hình bị sọc sau khi mở hộp' })
  description: string | null;

  @ApiProperty({ example: 'ChoDuyet', enum: ['ChoDuyet', 'DaDuyet', 'TuChoi', 'DangXuLy', 'HoanThanh'] })
  status: string;

  @ApiPropertyOptional({ example: 3 })
  processedById: number | null;

  @ApiPropertyOptional({ example: 'HangLoi' })
  inspectionResult: string | null;

  @ApiPropertyOptional({ example: 'HoanTien', enum: ['GiaoHangMoi', 'HoanTien', 'BaoHanh'] })
  resolution: string | null;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;
}
