import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Order } from '../entities/order.entity';

export class OrderItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 5 })
  variantId: number;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 15000000 })
  priceAtTime: number;

  @ApiProperty({ example: 30000000 })
  lineTotal: number;

  @ApiProperty({ example: 'Intel Core i9-14900K' })
  productNameSnapshot: string;

  @ApiProperty({ example: 'CPU-I9-14900K' })
  skuSnapshot: string;
}

export class OrderResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'ORD-20240115-1234' })
  orderCode: string;

  @ApiProperty({ example: 12 })
  customerId: number;

  @ApiProperty({ example: 3 })
  shippingAddressId: number;

  @ApiProperty({ example: 'ChoTT', enum: ['ChoTT', 'DaXacNhan', 'DongGoi', 'DangGiao', 'DaGiao', 'DaHuy', 'HoanTra'] })
  status: string;

  @ApiProperty({ example: 'GiaoChuan', enum: ['GiaoNhanh', 'GiaoChuan', 'NhanTaiCuaHang'] })
  shippingMethod: string;

  @ApiProperty({ example: 25000 })
  shippingFee: number;

  @ApiProperty({ example: 30000000 })
  subtotal: number;

  @ApiProperty({ example: 0 })
  discountAmount: number;

  @ApiProperty({ example: 30025000 })
  totalAmount: number;

  @ApiPropertyOptional({ example: 'Giao trước 5h chiều' })
  customerNote: string | null;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  orderedAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: [OrderItemResponseDto] })
  items?: OrderItemResponseDto[];
}

// ─── Admin list summary ───────────────────────────────────────────────────────

export class AdminOrderSummaryDto {
  id: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  itemCount: number;
  grandTotal: number;
}

const ORDER_STATUS_MAP: Record<string, string> = {
  ChoTT:      'pending',
  DaXacNhan:  'confirmed',
  DongGoi:    'processing',
  DangGiao:   'shipped',
  DaGiao:     'delivered',
  DaHuy:      'cancelled',
  HoanTra:    'returned',
};

const PAYMENT_STATUS_MAP: Record<string, string> = {
  ChuaThanhToan:  'unpaid',
  DaThanhToan:    'paid',
  DaHoanTien:     'refunded',
  HoanTienMotPhan: 'partially_refunded',
};

const PAYMENT_METHOD_MAP: Record<string, string> = {
  COD:   'cod',
  VNPay: 'vnpay',
  MoMo:  'momo',
};

interface CustomerRow {
  khach_hang_id: number;
  ho_ten: string;
  so_dien_thoai: string | null;
}

export function mapToAdminOrderSummary(
  order: Order,
  customer: CustomerRow | null,
  itemCount: number,
): AdminOrderSummaryDto {
  return {
    id: order.maDonHang,
    createdAt: order.ngayDatHang.toISOString(),
    status: ORDER_STATUS_MAP[order.trangThaiDon] ?? 'pending',
    paymentStatus: PAYMENT_STATUS_MAP[order.trangThaiThanhToan] ?? 'unpaid',
    paymentMethod: PAYMENT_METHOD_MAP[order.phuongThucThanhToan ?? ''] ?? '',
    customerId: String(order.khachHangId),
    customerName: customer?.ho_ten ?? '',
    customerPhone: customer?.so_dien_thoai ?? '',
    itemCount,
    grandTotal: Number(order.tongThanhToan),
  };
}

// ─── Admin order detail ───────────────────────────────────────────────────────

export interface AdminOrderDetailDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  channel: 'website' | 'pos' | 'phone';
  customerId: string;
  customer: { name: string; email: string; phone: string; userId: string };
  lineItems: Array<{
    id: string; productId: string; variantId: string;
    productName: string; variantName: string; sku: string;
    thumbnailUrl?: string; quantity: number; unitPrice: number; originalPrice: number;
  }>;
  shipping: {
    carrier?: string; trackingNumber?: string; estimatedDelivery?: string;
    address: { fullName: string; phone: string; street: string; ward: string; district: string; city: string };
  };
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  tax: number;
  grandTotal: number;
  customerNote?: string;
  internalNotes: Array<{
    id: string; authorName: string; authorRole: string;
    authorId?: string; text: string; createdAt: string;
  }>;
  activityLog: Array<{
    id: string; timestamp: string; actorName: string; actorRole: string;
    actorId?: string; action: string; detail?: string; orderStatus?: string;
  }>;
}

interface DetailCustomerRow { ho_ten: string; email: string; so_dien_thoai: string | null }
interface DetailAddressRow { ho_ten_nguoi_nhan: string; so_dien_thoai_nhan: string; dia_chi_chi_tiet: string; quan_huyen: string; tinh_thanh_pho: string }
interface DetailLineItemRow { chi_tiet_id: number; phien_ban_id: number; san_pham_id: number; so_luong: number; gia_tai_thoi_diem: number; ten_san_pham_snapshot: string; sku_snapshot: string; ten_phien_ban: string | null; ten_san_pham: string | null; gia_goc: number | null; thumbnail_url: string | null }
export interface NoteRow { ghi_chu_id: number; nhan_vien_id: number | null; ten_tac_gia: string; vai_tro_tac_gia: string; noi_dung: string; ngay_tao: Date }
export interface ActivityLogRow { nhat_ky_id: number; ten_nguoi_thuc_hien: string; vai_tro: string; nguoi_thuc_hien_id: number | null; hanh_dong: string; chi_tiet: string | null; trang_thai_don: string | null; thoi_diem: Date }
export function mapToAdminOrderDetail(
  order: Order,
  customer: DetailCustomerRow | null,
  address: DetailAddressRow | null,
  lineItems: DetailLineItemRow[],
  notes: NoteRow[] = [],
  activityLogs: ActivityLogRow[] = [],
): AdminOrderDetailDto {
  const addr = {
    fullName: address?.ho_ten_nguoi_nhan ?? '',
    phone:    address?.so_dien_thoai_nhan ?? '',
    street:   address?.dia_chi_chi_tiet ?? '',
    ward:     '',
    district: address?.quan_huyen ?? '',
    city:     address?.tinh_thanh_pho ?? '',
  };
  return {
    id:            order.maDonHang,
    createdAt:     order.ngayDatHang.toISOString(),
    updatedAt:     order.ngayCapNhat.toISOString(),
    status:        ORDER_STATUS_MAP[order.trangThaiDon] ?? 'pending',
    paymentStatus: PAYMENT_STATUS_MAP[order.trangThaiThanhToan] ?? 'unpaid',
    paymentMethod: PAYMENT_METHOD_MAP[order.phuongThucThanhToan ?? ''] ?? 'cod',
    channel:       'website',
    customerId:    String(order.khachHangId),
    customer: {
      name:   customer?.ho_ten ?? '',
      email:  customer?.email ?? '',
      phone:  customer?.so_dien_thoai ?? '',
      userId: String(order.khachHangId),
    },
    lineItems: lineItems.map((item) => ({
      id:           String(item.chi_tiet_id),
      productId:    String(item.san_pham_id),
      variantId:    String(item.phien_ban_id),
      productName:  item.ten_san_pham ?? item.ten_san_pham_snapshot,
      variantName:  item.ten_phien_ban ?? '',
      sku:          item.sku_snapshot,
      thumbnailUrl: item.thumbnail_url ?? undefined,
      quantity:     item.so_luong,
      unitPrice:    Number(item.gia_tai_thoi_diem),
      originalPrice: Number(item.gia_goc ?? item.gia_tai_thoi_diem),
    })),
    shipping: {
      carrier:           order.carrier ?? undefined,
      trackingNumber:    order.trackingNumber ?? undefined,
      estimatedDelivery: order.estimatedDelivery
        ? (order.estimatedDelivery instanceof Date ? order.estimatedDelivery : new Date(order.estimatedDelivery)).toISOString().slice(0, 10)
        : undefined,
      address: addr,
    },
    subtotal:       Number(order.tongTienHang),
    discountAmount: Number(order.soTienGiamGia),
    shippingFee:    Number(order.phiVanChuyen),
    tax:            0,
    grandTotal:     Number(order.tongThanhToan),
    customerNote:   order.ghiChuKhach ?? undefined,
    internalNotes: notes.map((n) => ({
      id:          String(n.ghi_chu_id),
      authorName:  n.ten_tac_gia,
      authorRole:  n.vai_tro_tac_gia,
      authorId:    n.nhan_vien_id != null ? String(n.nhan_vien_id) : undefined,
      text:        n.noi_dung,
      createdAt:   (n.ngay_tao instanceof Date ? n.ngay_tao : new Date(n.ngay_tao)).toISOString(),
    })),
    activityLog: activityLogs.map((log) => ({
      id:          String(log.nhat_ky_id),
      timestamp:   (log.thoi_diem instanceof Date ? log.thoi_diem : new Date(log.thoi_diem)).toISOString(),
      actorName:   log.ten_nguoi_thuc_hien,
      actorRole:   log.vai_tro,
      actorId:     log.nguoi_thuc_hien_id != null ? String(log.nguoi_thuc_hien_id) : undefined,
      action:      log.hanh_dong,
      detail:      log.chi_tiet ?? undefined,
      orderStatus: log.trang_thai_don ?? undefined,
    })),
  };
}

// ─── Transaction for order detail ─────────────────────────────────────────────

interface GiaoDichRow {
  giao_dich_id: number;
  don_hang_id: number;
  phuong_thuc_thanh_toan: string;
  so_tien: string;
  trang_thai_giao_dich: string;
  ma_giao_dich_ngoai: string | null;
  ngan_hang_vi: string | null;
  thoi_diem_thanh_toan: Date | null;
  ngay_tao: Date;
  ghi_chu_loi: string | null;
}

export function mapToTransaction(row: GiaoDichRow) {
  return {
    giaoDichId:          row.giao_dich_id,
    donHangId:           row.don_hang_id,
    phuongThucThanhToan: row.phuong_thuc_thanh_toan,
    soTien:              Number(row.so_tien),
    trangThaiGiaoDich:   row.trang_thai_giao_dich,
    maGiaoDichNgoai:     row.ma_giao_dich_ngoai,
    nganHangVi:          row.ngan_hang_vi,
    thoiDiemThanhToan:   row.thoi_diem_thanh_toan
      ? (row.thoi_diem_thanh_toan instanceof Date ? row.thoi_diem_thanh_toan : new Date(row.thoi_diem_thanh_toan)).toISOString()
      : null,
    ngayTao:             (row.ngay_tao instanceof Date ? row.ngay_tao : new Date(row.ngay_tao)).toISOString(),
    ghiChuLoi:           row.ghi_chu_loi,
  };
}
