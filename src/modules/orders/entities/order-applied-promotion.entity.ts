import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from './order.entity';

export enum AppliedPromotionType {
  COUPON = 'coupon',
  AUTO = 'auto',
  FLASHSALE = 'flashsale',
  FREE_SHIPPING = 'free_shipping',
  BUNDLE = 'bundle',
  BXGY = 'bxgy',
}

@Entity('don_hang_khuyen_mai_ap_dung')
@Index('idx_dhkm_donhang', ['donHangId'])
export class OrderAppliedPromotion {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'don_hang_id' })
  donHangId: number;

  @ManyToOne(() => Order, { nullable: false, eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'don_hang_id' })
  donHang: Order;

  @Column({ name: 'khuyen_mai_id', type: 'int', nullable: true })
  khuyenMaiId: number | null;

  @Column({ name: 'ten', length: 300 })
  ten: string;

  @Column({ name: 'ma_coupon', length: 50, nullable: true })
  maCoupon: string | null;

  @Column({
    name: 'loai',
    type: 'varchar',
    length: 20,
  })
  loai: AppliedPromotionType;

  @Column({ name: 'so_tien_giam', type: 'decimal', precision: 18, scale: 2 })
  soTienGiam: number;

  @CreateDateColumn({ name: 'ngay_tao' })
  ngayTao: Date;
}
