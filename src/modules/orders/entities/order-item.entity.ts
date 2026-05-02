import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from './order.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';

@Entity('chi_tiet_don_hang')
@Index('idx_ctdh_donhang', ['donHangId'])
export class OrderItem {
  @PrimaryGeneratedColumn({ name: 'chi_tiet_id' })
  id: number;

  @Column({ name: 'don_hang_id' })
  donHangId: number;

  @Column({ name: 'phien_ban_id' })
  phienBanId: number;

  @ManyToOne(() => ProductVariant, { nullable: false, eager: false })
  @JoinColumn({ name: 'phien_ban_id' })
  phienBan: ProductVariant;

  @Column({ name: 'so_luong' })
  soLuong: number;

  @Column({ name: 'gia_tai_thoi_diem', type: 'decimal', precision: 18, scale: 2 })
  giaTaiThoiDiem: number;

  @Column({ name: 'thanh_tien', type: 'decimal', precision: 18, scale: 2 })
  thanhTien: number;

  @Column({ name: 'ten_san_pham_snapshot', length: 500 })
  tenSanPhamSnapshot: string;

  @Column({ name: 'sku_snapshot', length: 100 })
  skuSnapshot: string;

  @ManyToOne(() => Order, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'don_hang_id' })
  order: Order;
}
