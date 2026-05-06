import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { ReturnRequest } from './return-request.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Transaction } from '../../payments/entities/transaction.entity';
import { Order } from '../../orders/entities/order.entity';

export type HuongXuLy = 'HoanTien' | 'GiaoHangMoi' | 'BaoHanh';
export type TrangThaiXuLy = 'DangXuLy' | 'HoanThanh' | 'ThatBai';
export type TinhTrangHangNhan = 'NguyenVen' | 'HuHong' | 'ThieuPhuKien';
export type XuLyHangLoi = 'TraNhaCungCap' | 'TieuHuy' | 'TaiSuDung';

@Entity('doi_tra_xu_ly')
@Index('idx_dtxl_yeucau', ['yeuCauDoiTraId'])
export class ReturnResolution {
  @PrimaryGeneratedColumn({ name: 'xu_ly_id' })
  id: number;

  @Column({ name: 'yeu_cau_doi_tra_id' })
  yeuCauDoiTraId: number;

  @ManyToOne(() => ReturnRequest, { nullable: false, eager: false })
  @JoinColumn({ name: 'yeu_cau_doi_tra_id' })
  yeuCauDoiTra: ReturnRequest;

  @Column({ name: 'huong_xu_ly', length: 20 })
  huongXuLy: HuongXuLy;

  @Column({ name: 'trang_thai', length: 20, default: 'DangXuLy' })
  trangThai: TrangThaiXuLy;

  // ── Nhận hàng trở lại (chung cho cả 3 loại) ─────────────────────────────
  // FK omitted to avoid circular dependency with inventory module
  @Column({ name: 'phieu_nhap_kho_id', nullable: true })
  phieuNhapKhoId: number | null;

  @Column({ name: 'nguoi_kiem_tra_id', nullable: true })
  nguoiKiemTraId: number | null;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'nguoi_kiem_tra_id' })
  nguoiKiemTra: Employee | null;

  @Column({ name: 'tinh_trang_hang_nhan', length: 30, nullable: true })
  tinhTrangHangNhan: TinhTrangHangNhan | null;

  @Column({ name: 'ghi_chu_kiem_tra', type: 'text', nullable: true })
  ghiChuKiemTra: string | null;

  // ── Chỉ dùng cho: HoanTien ───────────────────────────────────────────────
  @Column({ name: 'so_tien_hoan', type: 'decimal', precision: 18, scale: 2, nullable: true })
  soTienHoan: number | null;

  @Column({ name: 'phuong_thuc_hoan', length: 30, nullable: true })
  phuongThucHoan: string | null;

  @Column({ name: 'giao_dich_hoan_id', nullable: true })
  giaoDichHoanId: number | null;

  @ManyToOne(() => Transaction, { nullable: true, eager: false })
  @JoinColumn({ name: 'giao_dich_hoan_id' })
  giaoDichHoan: Transaction | null;

  @Column({ name: 'ma_giao_dich_hoan', length: 100, nullable: true })
  maGiaoDichHoan: string | null;

  @Column({ name: 'ngan_hang_vi_hoan', length: 100, nullable: true })
  nganHangViHoan: string | null;

  @Column({ name: 'thoi_diem_hoan', type: 'datetime', nullable: true })
  thoiDiemHoan: Date | null;

  // ── Chỉ dùng cho: GiaoHangMoi ────────────────────────────────────────────
  @Column({ name: 'don_hang_doi_id', nullable: true })
  donHangDoiId: number | null;

  @ManyToOne(() => Order, { nullable: true, eager: false })
  @JoinColumn({ name: 'don_hang_doi_id' })
  donHangDoi: Order | null;

  @Column({ name: 'tracking_doi_hang', length: 200, nullable: true })
  trackingDoiHang: string | null;

  @Column({ name: 'carrier_doi_hang', length: 100, nullable: true })
  carrierDoiHang: string | null;

  // ── Chỉ dùng cho: BaoHanh ────────────────────────────────────────────────
  @Column({ name: 'ma_bao_hanh_hang', length: 100, nullable: true })
  maBaoHanhHang: string | null;

  @Column({ name: 'ngay_gui_hang_bao_hanh', type: 'date', nullable: true })
  ngayGuiHangBaoHanh: Date | null;

  // Vận đơn kho gửi hàng đến hãng bảo hành
  @Column({ name: 'tracking_gui_nha_sx', length: 200, nullable: true })
  trackingGuiNhaSanXuat: string | null;

  @Column({ name: 'carrier_gui_nha_sx', length: 100, nullable: true })
  carrierGuiNhaSanXuat: string | null;

  @Column({ name: 'ngay_nhan_hang_ve', type: 'date', nullable: true })
  ngayNhanHangVe: Date | null;

  @Column({ name: 'ket_qua_bao_hanh', type: 'text', nullable: true })
  ketQuaBaoHanh: string | null;

  // Vận đơn gửi hàng bảo hành trả về khách
  @Column({ name: 'tracking_tra_khach', length: 200, nullable: true })
  trackingTraKhach: string | null;

  @Column({ name: 'carrier_tra_khach', length: 100, nullable: true })
  carrierTraKhach: string | null;

  // ── Xử lý hàng lỗi/hàng hoàn trả (sau khi resolution hoàn thành) ────────
  @Column({ name: 'xu_ly_hang_loi', length: 30, nullable: true })
  defectiveHandling: XuLyHangLoi | null;

  @Column({ name: 'ngay_xu_ly_hang_loi', type: 'datetime', nullable: true })
  defectiveHandledAt: Date | null;

  @Column({ name: 'nv_xu_ly_hang_loi_id', nullable: true })
  defectiveHandledById: number | null;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'nv_xu_ly_hang_loi_id' })
  defectiveHandledBy: Employee | null;

  @Column({ name: 'ghi_chu_hang_loi', type: 'text', nullable: true })
  defectiveNotes: string | null;

  // ── Chung ────────────────────────────────────────────────────────────────
  @Column({ name: 'nguoi_xu_ly_id' })
  nguoiXuLyId: number;

  @ManyToOne(() => Employee, { nullable: false, eager: false })
  @JoinColumn({ name: 'nguoi_xu_ly_id' })
  nguoiXuLy: Employee;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string | null;

  @CreateDateColumn({ name: 'ngay_tao' })
  ngayTao: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  ngayCapNhat: Date;
}
