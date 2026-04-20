import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { OrderItem } from './order-item.entity';
import { OrderStatusHistory } from './order-status-history.entity';

export enum TrangThaiDon {
  CHO_XAC_NHAN = 'ChoTT',
  DA_XAC_NHAN = 'DaXacNhan',
  DONG_GOI = 'DongGoi',
  DANG_GIAO = 'DangGiao',
  DA_GIAO = 'DaGiao',
  DA_HUY = 'DaHuy',
  HOAN_TRA = 'HoanTra',
}

export enum PhuongThucVanChuyen {
  GIAO_NHANH = 'GiaoNhanh',
  GIAO_CHUAN = 'GiaoChuan',
  NHAN_TAI_CUA_HANG = 'NhanTaiCuaHang',
}

@Entity('don_hang')
@Index('idx_dh_khachhang', ['khachHangId'])
@Index('idx_dh_trangthai', ['trangThaiDon'])
@Index('idx_dh_ngaydat', ['ngayDatHang'])
export class Order {
  @PrimaryGeneratedColumn({ name: 'don_hang_id' })
  id: number;

  @Column({ name: 'ma_don_hang', length: 50 })
  @Index('uq_dh_madonhang', { unique: true })
  maDonHang: string;

  @Column({ name: 'khach_hang_id' })
  khachHangId: number;

  @Column({ name: 'dia_chi_giao_hang_id' })
  diaChiGiaoHangId: number;

  @Column({ name: 'nhan_vien_xu_ly_id', nullable: true })
  nhanVienXuLyId: number | null;

  @Column({
    name: 'trang_thai_don',
    type: 'varchar',
    length: 30,
    default: 'ChoTT',
  })
  trangThaiDon: TrangThaiDon;

  @Column({
    name: 'phuong_thuc_van_chuyen',
    type: 'varchar',
    length: 30,
    default: 'GiaoChuan',
  })
  phuongThucVanChuyen: PhuongThucVanChuyen;

  @Column({ name: 'phi_van_chuyen', type: 'decimal', precision: 18, scale: 2, default: 0 })
  phiVanChuyen: number;

  @Column({ name: 'tong_tien_hang', type: 'decimal', precision: 18, scale: 2 })
  tongTienHang: number;

  @Column({ name: 'so_tien_giam_gia', type: 'decimal', precision: 18, scale: 2, default: 0 })
  soTienGiamGia: number;

  @Column({ name: 'discount_total', type: 'decimal', precision: 18, scale: 2, default: 0 })
  discountTotal: number;

  @Column({ name: 'tong_thanh_toan', type: 'decimal', precision: 18, scale: 2 })
  tongThanhToan: number;

  @Column({ name: 'ghi_chu_khach', type: 'text', nullable: true })
  ghiChuKhach: string | null;

  @CreateDateColumn({ name: 'ngay_dat_hang' })
  ngayDatHang: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  ngayCapNhat: Date;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => OrderStatusHistory, (h) => h.order, { cascade: true })
  statusHistory: OrderStatusHistory[];
}
