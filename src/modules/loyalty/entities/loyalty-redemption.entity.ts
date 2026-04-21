import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('loyalty_redemption')
@Index('idx_lr_khachhang', ['khachHangId'])
export class LoyaltyRedemption {
  @PrimaryGeneratedColumn({ name: 'redemption_id' })
  id: number;

  @Column({ name: 'khach_hang_id' })
  khachHangId: number;

  @Column({ name: 'catalog_id' })
  catalogId: number;

  @Column({ name: 'ten_snapshot', length: 300 })
  tenSnapshot: string;

  @Column({ name: 'diem_da_doi' })
  diemDaDoi: number;

  @Column({ name: 'ma_coupon', length: 50 })
  maCoupon: string;

  @Column({ name: 'promotion_id' })
  promotionId: number;

  @Column({ name: 'trang_thai', length: 20, default: 'completed' })
  trangThai: 'completed' | 'cancelled' | 'expired';

  @CreateDateColumn({ name: 'ngay_doi' })
  ngayDoi: Date;

  @Column({ name: 'ngay_su_dung', type: 'datetime', nullable: true })
  ngaySuDung: Date | null;

  @Column({ name: 'don_hang_id', nullable: true })
  donHangId: number | null;
}
