export class NotificationAdminRow {
  thongBaoId: number;
  khachHangId: number;
  tenKhachHang: string;
  emailKhachHang: string;
  loaiThongBao: string;
  tieuDe: string;
  noiDung: string;
  kenhGui: string;
  trangThai: string;
  daDoc: boolean;
  entityLienQuan: string | null;
  entityLienQuanId: number | null;
  /** ma_don_hang từ bảng don_hang — chỉ có khi entityLienQuan = 'DonHang' */
  maDonHang: string | null;
  /** ma_giao_dich_ngoai từ bảng giao_dich — chỉ có khi entityLienQuan = 'GiaoDich' */
  maGiaoDichNgoai: string | null;
  ngayTao: string;
}
