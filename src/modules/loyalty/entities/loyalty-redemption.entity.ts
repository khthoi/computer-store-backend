import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Customer } from '../../users/entities/customer.entity';
import { RedemptionCatalog } from './redemption-catalog.entity';
import { Promotion } from '../../promotions/entities/promotion.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('loyalty_redemption')
@Index('idx_lr_khachhang', ['khachHangId'])
export class LoyaltyRedemption {
  @PrimaryGeneratedColumn({ name: 'redemption_id' })
  id: number;

  @Column({ name: 'khach_hang_id' })
  khachHangId: number;

  @ManyToOne(() => Customer, { nullable: false, eager: false })
  @JoinColumn({ name: 'khach_hang_id' })
  khachHang: Customer;

  @Column({ name: 'catalog_id' })
  catalogId: number;

  @ManyToOne(() => RedemptionCatalog, { nullable: false, eager: false })
  @JoinColumn({ name: 'catalog_id' })
  catalog: RedemptionCatalog;

  @Column({ name: 'ten_snapshot', length: 300 })
  tenSnapshot: string;

  @Column({ name: 'diem_da_doi' })
  diemDaDoi: number;

  @Column({ name: 'ma_coupon', length: 50 })
  maCoupon: string;

  @Column({ name: 'promotion_id' })
  promotionId: number;

  @ManyToOne(() => Promotion, { nullable: false, eager: false })
  @JoinColumn({ name: 'promotion_id' })
  promotion: Promotion;

  @Column({ name: 'trang_thai', length: 20, default: 'completed' })
  trangThai: 'completed' | 'cancelled' | 'expired';

  @CreateDateColumn({ name: 'ngay_doi' })
  ngayDoi: Date;

  @Column({ name: 'ngay_su_dung', type: 'datetime', nullable: true })
  ngaySuDung: Date | null;

  @Column({ name: 'don_hang_id', nullable: true })
  donHangId: number | null;

  @ManyToOne(() => Order, { nullable: true, eager: false })
  @JoinColumn({ name: 'don_hang_id' })
  donHang: Order | null;
}
