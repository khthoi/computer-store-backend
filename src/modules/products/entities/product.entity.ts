import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProductVariant } from './product-variant.entity';
import { Category } from '../../categories/entities/category.entity';

@Entity('san_pham')
@Index('idx_sp_danhmuc', ['danhMucId'])
@Index('idx_sp_trangthai', ['trangThai'])
export class Product {
  @PrimaryGeneratedColumn({ name: 'san_pham_id' })
  id: number;

  @Column({ name: 'danh_muc_id' })
  danhMucId: number;

  @Column({ name: 'ma_san_pham', length: 255 })
  @Index('uq_sp_ma', { unique: true })
  maSanPham: string;

  @Column({ name: 'ten_san_pham', length: 500 })
  tenSanPham: string;

  @Column({ length: 500 })
  @Index('uq_sp_slug', { unique: true })
  slug: string;

  @Column({ name: 'mo_ta_ngan', type: 'text', nullable: true })
  moTaNgan: string | null;

  @Column({ name: 'mo_ta_chi_tiet', type: 'text', nullable: true })
  moTaChiTiet: string | null;

  @Column({ name: 'chinh_sach_bao_hanh', length: 500, nullable: true })
  chinhSachBaoHanh: string | null;

  @Column({ name: 'diem_danh_gia_tb', type: 'decimal', precision: 3, scale: 2, nullable: true })
  diemDanhGiaTb: number | null;

  @Column({ name: 'so_luot_danh_gia', default: 0 })
  soLuotDanhGia: number;

  @Column({ name: 'trang_thai', length: 20, default: 'Nhap' })
  trangThai: string; // 'DangBan' | 'NgungBan' | 'Nhap'

  @Column({ name: 'nguoi_tao_id' })
  nguoiTaoId: number;

  @CreateDateColumn({ name: 'ngay_tao' })
  ngayTao: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  ngayCapNhat: Date;

  @ManyToOne(() => Category, { nullable: true, eager: false })
  @JoinColumn({ name: 'danh_muc_id' })
  danhMuc: Category | null;

  @OneToMany(() => ProductVariant, (v) => v.product, { cascade: true })
  variants: ProductVariant[];
}
