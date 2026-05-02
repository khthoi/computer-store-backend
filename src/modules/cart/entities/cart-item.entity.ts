import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Cart } from './cart.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';

@Entity('chi_tiet_gio_hang')
@Index('idx_ctgh_giohangs', ['gioHangId'])
@Index('uq_ctgh_phienban', ['gioHangId', 'phienBanId'], { unique: true })
export class CartItem {
  @PrimaryGeneratedColumn({ name: 'chi_tiet_gio_hang_id' })
  id: number;

  @Column({ name: 'gio_hang_id' })
  gioHangId: number;

  @Column({ name: 'phien_ban_id' })
  phienBanId: number;

  @ManyToOne(() => ProductVariant, { nullable: false, eager: false })
  @JoinColumn({ name: 'phien_ban_id' })
  phienBan: ProductVariant;

  @Column({ name: 'so_luong' })
  soLuong: number;

  @Column({ name: 'gia_tai_thoi_diem', type: 'decimal', precision: 18, scale: 2 })
  giaTaiThoiDiem: number;

  @CreateDateColumn({ name: 'ngay_them' })
  ngayThem: Date;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gio_hang_id' })
  cart: Cart;
}
