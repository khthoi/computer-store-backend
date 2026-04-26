import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 5 })
  variantId: number;

  @ApiProperty({ example: 12 })
  customerId: number;

  @ApiProperty({ example: 8 })
  orderId: number;

  @ApiProperty({ example: 5 })
  rating: number;

  @ApiPropertyOptional({ example: 'Sản phẩm rất tốt' })
  title: string | null;

  @ApiPropertyOptional({ example: 'Hàng đúng mô tả, giao hàng nhanh' })
  content: string | null;

  @ApiProperty({ example: 'Pending', enum: ['Pending', 'Approved', 'Rejected', 'Hidden'] })
  status: string;

  @ApiProperty({ example: false })
  hasReply: boolean;

  @ApiProperty({ example: 0 })
  helpfulCount: number;

  @ApiPropertyOptional({ example: 3 })
  approvedById: number | null;

  @ApiPropertyOptional({ example: null })
  rejectReason: string | null;

  @ApiPropertyOptional({ example: null })
  approvedAt: string | null;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;

  // ── Joined fields (populated by admin list endpoint) ──────────────────────

  @ApiPropertyOptional({ example: 'Laptop Gaming ASUS ROG' })
  tenSanPham?: string | null;

  @ApiPropertyOptional({ example: 'RAM 16GB / RTX 4060' })
  tenPhienBan?: string | null;

  @ApiPropertyOptional({ example: 'https://example.com/img.jpg' })
  anhPhienBan?: string | null;

  @ApiPropertyOptional({ example: 'Nguyễn Văn An' })
  khachHangTen?: string | null;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  khachHangAvatar?: string | null;

  @ApiPropertyOptional({ example: 'DH-2024-000301' })
  maDonHang?: string | null;

  @ApiPropertyOptional({ example: 'Admin Hệ thống' })
  nguoiDuyetTen?: string | null;
}

export class ReviewMessageResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  reviewId: number;

  @ApiProperty({ example: 'NhanVien', enum: ['KhachHang', 'NhanVien', 'HeThong'] })
  senderType: string;

  @ApiPropertyOptional({ example: 3 })
  senderId: number | null;

  @ApiProperty({ example: 'Cảm ơn bạn đã đánh giá!' })
  content: string;

  @ApiProperty({ example: 'Reply', enum: ['Reply', 'InternalNote', 'SystemLog'] })
  messageType: string;

  @ApiProperty({ example: true })
  isVisibleToCustomer: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;
}
