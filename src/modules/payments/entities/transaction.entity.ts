import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum PhuongThucThanhToan {
  COD = 'COD',
  CHUYEN_KHOAN = 'ChuyenKhoan',
  THE_NGAN_HANG = 'TheNganHang',
  VI_DIEN_TU = 'ViDienTu',
  TRA_GOP = 'TraGop',
}

export enum TrangThaiGiaoDich {
  CHO = 'Cho',
  THANH_CONG = 'ThanhCong',
  THAT_BAI = 'ThatBai',
  DA_HOAN = 'DaHoan',
}

@Entity('giao_dich')
@Index('uq_gd_donhang', ['donHangId'], { unique: true })
@Index('idx_gd_trangthai', ['trangThaiGiaoDich'])
export class Transaction {
  @PrimaryGeneratedColumn({ name: 'giao_dich_id' })
  id: number;

  @Column({ name: 'don_hang_id' })
  donHangId: number;

  @Column({
    name: 'phuong_thuc_thanh_toan',
    type: 'enum',
    enum: PhuongThucThanhToan,
    enumName: 'phuong_thuc_thanh_toan_enum',
  })
  phuongThucThanhToan: PhuongThucThanhToan;

  @Column({ name: 'so_tien', type: 'decimal', precision: 18, scale: 2 })
  soTien: number;

  @Column({
    name: 'trang_thai_giao_dich',
    type: 'enum',
    enum: TrangThaiGiaoDich,
    enumName: 'trang_thai_giao_dich_enum',
    default: TrangThaiGiaoDich.CHO,
  })
  trangThaiGiaoDich: TrangThaiGiaoDich;

  @Column({ name: 'ma_giao_dich_ngoai', length: 255, nullable: true })
  maGiaoDichNgoai: string | null;

  @Column({ name: 'ngan_hang_vi', length: 100, nullable: true })
  nganHangVi: string | null;

  @Column({ name: 'thoi_diem_thanh_toan', type: 'timestamp', nullable: true })
  thoiDiemThanhToan: Date | null;

  @Column({ name: 'ghi_chu_loi', type: 'text', nullable: true })
  ghiChuLoi: string | null;

  @CreateDateColumn({ name: 'ngay_tao' })
  ngayTao: Date;
}
