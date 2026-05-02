import { ApiProperty } from '@nestjs/swagger';

export class TransactionRowResponseDto {
  @ApiProperty() giaoDichId: number;
  @ApiProperty() donHangId: number;
  @ApiProperty() maDonHang: string;
  @ApiProperty() khachHangId: number;
  @ApiProperty() tenKhachHang: string;
  @ApiProperty() emailKhachHang: string;
  @ApiProperty() phuongThucThanhToan: string;
  @ApiProperty() soTien: number;
  @ApiProperty() trangThaiGiaoDich: string;
  @ApiProperty({ nullable: true }) maGiaoDichNgoai: string | null;
  @ApiProperty({ nullable: true }) nganHangVi: string | null;
  @ApiProperty({ nullable: true }) thoiDiemThanhToan: string | null;
  @ApiProperty() ngayTao: string;
  @ApiProperty({ nullable: true }) ghiChuLoi: string | null;
}

export class GetTransactionsResponseDto {
  @ApiProperty({ type: [TransactionRowResponseDto] }) data: TransactionRowResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}

export function toTransactionRowDto(raw: Record<string, any>): TransactionRowResponseDto {
  const thoiDiem = raw.t_thoiDiemThanhToan ?? raw['t_thoi_diem_thanh_toan'];
  const ngayTao = raw.t_ngayTao ?? raw['t_ngay_tao'];

  return {
    giaoDichId:          Number(raw.t_id ?? raw['t_giao_dich_id']),
    donHangId:           Number(raw.t_donHangId ?? raw['t_don_hang_id']),
    maDonHang:           raw.o_maDonHang ?? raw['o_ma_don_hang'] ?? '',
    khachHangId:         Number(raw.o_khachHangId ?? raw['o_khach_hang_id']),
    tenKhachHang:        raw.kh_hoTen ?? raw['kh_ho_ten'] ?? '',
    emailKhachHang:      raw.kh_email ?? '',
    phuongThucThanhToan: raw.t_phuongThucThanhToan ?? raw['t_phuong_thuc_thanh_toan'] ?? '',
    soTien:              parseFloat(raw.t_soTien ?? raw['t_so_tien'] ?? '0'),
    trangThaiGiaoDich:   raw.t_trangThaiGiaoDich ?? raw['t_trang_thai_giao_dich'] ?? '',
    maGiaoDichNgoai:     raw.t_maGiaoDichNgoai ?? raw['t_ma_giao_dich_ngoai'] ?? null,
    nganHangVi:          raw.t_nganHangVi ?? raw['t_ngan_hang_vi'] ?? null,
    thoiDiemThanhToan:   thoiDiem ? new Date(thoiDiem).toISOString() : null,
    ngayTao:             ngayTao ? new Date(ngayTao).toISOString() : new Date().toISOString(),
    ghiChuLoi:           raw.t_ghiChuLoi ?? raw['t_ghi_chu_loi'] ?? null,
  };
}
