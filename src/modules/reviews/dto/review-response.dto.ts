import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewResponseDto {
  @ApiProperty({ example: 1 })
  reviewId: number;

  @ApiProperty({ example: 5 })
  phienBanId: number;

  @ApiProperty({ example: 12 })
  khachHangId: number;

  @ApiProperty({ example: 8 })
  donHangId: number;

  @ApiProperty({ example: 5 })
  rating: number;

  @ApiPropertyOptional({ example: 'Sản phẩm rất tốt' })
  tieuDe: string | null;

  @ApiPropertyOptional({ example: 'Hàng đúng mô tả, giao hàng nhanh' })
  noiDung: string | null;

  @ApiPropertyOptional({
    example: ['https://res.cloudinary.com/.../review1.jpg'],
    description: 'URLs ảnh đính kèm review (Cloudinary)',
  })
  hinhAnh?: string[];

  @ApiProperty({ example: 'Pending', enum: ['Pending', 'Approved', 'Rejected', 'Hidden'] })
  trangThai: string;

  @ApiProperty({ example: false })
  daPhanHoi: boolean;

  @ApiProperty({ example: 0 })
  helpfulCount: number;

  @ApiPropertyOptional({ example: 3 })
  nguoiDuyetId: number | null;

  @ApiPropertyOptional({ example: null })
  lyDoTuChoi: string | null;

  @ApiPropertyOptional({ example: null })
  duyetTai: string | null;

  @ApiProperty({ example: 'Website', enum: ['Website', 'App', 'Import'] })
  nguon: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;

  // ── Joined fields (populated by admin list endpoint) ──────────────────────

  @ApiPropertyOptional({ example: 1 })
  sanPhamId?: number | null;

  @ApiPropertyOptional({ example: 'Laptop Gaming ASUS ROG' })
  tenSanPham?: string | null;

  @ApiPropertyOptional({ example: 'RAM 16GB / RTX 4060' })
  tenPhienBan?: string | null;

  @ApiPropertyOptional({ example: 'ASUS-ROG-G15-16GB-4060' })
  skuPhienBan?: string | null;

  @ApiPropertyOptional({ example: 'https://example.com/img.jpg' })
  anhPhienBan?: string | null;

  @ApiPropertyOptional({ example: 'Nguyễn Văn An' })
  khachHangTen?: string | null;

  @ApiPropertyOptional({ example: '0901234567' })
  khachHangSdT?: string | null;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  khachHangAvatar?: string | null;

  @ApiPropertyOptional({ example: 'DH-2024-000301' })
  maDonHang?: string | null;

  @ApiPropertyOptional({ example: 'Admin Hệ thống' })
  nguoiDuyetTen?: string | null;

  @ApiPropertyOptional({ example: 'NV-001' })
  nguoiDuyetMa?: string | null;
}

export class ReviewMessageResponseDto {
  @ApiProperty({ example: 1 })
  messageId: number;

  @ApiProperty({ example: 1 })
  reviewId: number;

  @ApiProperty({ example: 'NhanVien', enum: ['KhachHang', 'NhanVien', 'HeThong'] })
  senderType: string;

  @ApiPropertyOptional({ example: 3 })
  senderId: number | null;

  @ApiProperty({ example: 'Admin Hệ thống' })
  senderName: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  senderAvatar: string | null;

  @ApiPropertyOptional({ example: 'NV-001' })
  senderCode?: string | null;

  @ApiProperty({ example: 'Cảm ơn bạn đã đánh giá!' })
  noiDungTinNhan: string;

  @ApiProperty({ example: 'Reply', enum: ['Reply', 'InternalNote', 'SystemLog'] })
  messageType: string;

  @ApiProperty({ example: true })
  isVisibleToCustomer: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date | null;
}
