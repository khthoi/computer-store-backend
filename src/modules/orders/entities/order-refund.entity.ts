import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('hoan_tien_don_hang')
@Index('idx_htdh_don_hang', ['donHangId'])
export class OrderRefund {
  @PrimaryGeneratedColumn({ name: 'hoan_tien_id' })
  id: number;

  @Column({ name: 'don_hang_id' })
  donHangId: number;

  @Column({ name: 'giao_dich_id', nullable: true })
  giaoDichId: number | null;

  @Column({ name: 'phuong_thuc', length: 20 })
  phuongThuc: string;

  @Column({ name: 'phuong_thuc_thuc_te', length: 30, default: 'unknown' })
  phuongThucThucTe: string;

  @Column({ name: 'so_tien', type: 'decimal', precision: 18, scale: 2 })
  soTien: number;

  @Column({ name: 'items_json', type: 'text' })
  itemsJson: string;

  @Column({ name: 'nguoi_xu_ly', length: 100 })
  nguoiXuLy: string;

  @Column({ name: 'trang_thai', length: 20, default: 'Cho' })
  trangThai: string;

  @Column({ name: 'ly_do', type: 'text', nullable: true })
  lyDo: string | null;

  @Column({ name: 'yeu_cau_doi_tra_id', nullable: true })
  yeuCauDoiTraId: number | null;

  // Track A settlement fields
  @Column({ name: 'ma_giao_dich_hoan', length: 255, nullable: true })
  maGiaoDichHoan: string | null;

  @Column({ name: 'thoi_diem_hoan', type: 'datetime', nullable: true })
  thoiDiemHoan: Date | null;

  @Column({ name: 'ngan_hang_vi_hoan', length: 100, nullable: true })
  nganHangViHoan: string | null;

  @Column({ name: 'ghi_chu_loi', type: 'text', nullable: true })
  ghiChuLoi: string | null;

  @Column({ name: 'nguoi_duyet_id', nullable: true })
  nguoiDuyetId: number | null;

  @CreateDateColumn({ name: 'ngay_tao' })
  ngayTao: Date;
}
