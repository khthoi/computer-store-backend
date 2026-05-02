import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Product } from './product.entity';
import { ProductImage } from './product-image.entity';
import { StockLevel } from '../../inventory/entities/stock-level.entity';

@Entity('phien_ban_san_pham')
@Index('idx_pbsp_sanpham', ['sanPhamId'])
export class ProductVariant {
  @PrimaryGeneratedColumn({ name: 'phien_ban_id' })
  id: number;

  @Column({ name: 'san_pham_id' })
  sanPhamId: number;

  @Column({ name: 'ten_phien_ban', length: 300 })
  tenPhienBan: string;

  @Column({ name: 'sku', length: 100 })
  @Index('uq_pbsp_sku', { unique: true })
  sku: string;

  @Column({ name: 'gia_goc', type: 'decimal', precision: 18, scale: 2 })
  giaGoc: number;

  @Column({ name: 'gia_ban', type: 'decimal', precision: 18, scale: 2 })
  giaBan: number;

  @Column({ name: 'trong_luong', type: 'decimal', precision: 8, scale: 3, nullable: true })
  trongLuong: number | null;

  @Column({ name: 'trang_thai', length: 20, default: 'HienThi' })
  trangThai: string; // 'HienThi' | 'An' | 'HetHang'

  @Column({ name: 'mo_ta_chi_tiet', type: 'text', nullable: true })
  moTaChiTiet: string | null;

  @Column({ name: 'chinh_sach_bao_hanh', type: 'text', nullable: true })
  chinhSachBaoHanh: string | null;

  @Column({ name: 'is_mac_dinh', type: 'boolean', default: false })
  isMacDinh: boolean;

  @Column({ name: 'thoi_gian_bao_hanh', type: 'smallint', unsigned: true, nullable: true })
  thoiGianBaoHanh: number | null;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  ngayCapNhat: Date;

  @ManyToOne(() => Product, (p) => p.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'san_pham_id' })
  product: Product;

  @OneToMany(() => ProductImage, (img) => img.variant, { cascade: true })
  images: ProductImage[];

  @OneToOne(() => StockLevel, (sl) => sl.phienBan, { nullable: true, eager: false })
  stockLevel: StockLevel | null;
}
