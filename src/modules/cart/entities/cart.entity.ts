import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { CartItem } from './cart-item.entity';

@Entity('gio_hang')
export class Cart {
  @PrimaryGeneratedColumn({ name: 'gio_hang_id' })
  id: number;

  @Column({ name: 'khach_hang_id' })
  @Index('uq_gh_khachhang', { unique: true })
  khachHangId: number;

  @Column({ name: 'coupon_code', length: 50, nullable: true })
  couponCode: string | null;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  ngayCapNhat: Date;

  @OneToMany(() => CartItem, (item) => item.cart, { cascade: true, eager: true })
  items: CartItem[];
}
