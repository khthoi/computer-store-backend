import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ShippingAddress } from './shipping-address.entity';
import { MediaAsset } from '../../media/entities/media-asset.entity';

@Entity('khach_hang')
@Index('idx_kh_trangthai_ngay', ['trangThai', 'ngayDangKy'])
export class Customer {
  @PrimaryGeneratedColumn({ name: 'khach_hang_id' })
  id: number;

  @Column({ length: 255 })
  @Index('uq_kh_email', { unique: true })
  email: string;

  @Column({ name: 'so_dien_thoai', length: 20, nullable: true })
  @Index('uq_kh_sdt', { unique: true })
  soDienThoai: string | null;

  @Column({ name: 'ho_ten', length: 255 })
  hoTen: string;

  @Column({ name: 'mat_khau_hash', length: 255, select: false })
  matKhauHash: string;

  @Column({ name: 'ngay_sinh', type: 'date', nullable: true })
  ngaySinh: Date | null;

  @Column({ length: 10, nullable: true })
  gioiTinh: string | null; // 'Nam' | 'Nu' | 'Khac'

  @Column({ name: 'anh_dai_dien', type: 'text', nullable: true })
  anhDaiDien: string | null;

  @Column({ name: 'trang_thai', length: 30, default: 'HoatDong' })
  trangThai: string; // 'HoatDong' | 'BiKhoa' | 'ChoXacMinh'

  @CreateDateColumn({ name: 'ngay_dang_ky' })
  ngayDangKy: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat_cuoi' })
  ngayCapNhatCuoi: Date;

  @Column({ name: 'xac_minh_email', default: false })
  xacMinhEmail: boolean;

  @Column({ name: 'diem_hien_tai', default: 0 })
  diemHienTai: number;

  @Column({ name: 'so_du_vi', type: 'decimal', precision: 18, scale: 2, default: 0 })
  soDuVi: number;

  @Column({ name: 'asset_id_avatar', nullable: true })
  assetIdAvatar: number | null;

  @ManyToOne(() => MediaAsset, { nullable: true, eager: false })
  @JoinColumn({ name: 'asset_id_avatar' })
  avatar: MediaAsset | null;

  @OneToMany(() => ShippingAddress, (addr) => addr.customer, { cascade: true })
  addresses: ShippingAddress[];
}
