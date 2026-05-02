import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Customer } from '../../users/entities/customer.entity';

@Entity('loyalty_point_transaction')
@Index('idx_lpt_khachhang', ['khachHangId'])
@Index('idx_lpt_thamchieu', ['loaiThamChieu', 'thamChieuId'])
export class LoyaltyTransaction {
  @PrimaryGeneratedColumn({ name: 'transaction_id' })
  id: number;

  @Column({ name: 'khach_hang_id' })
  khachHangId: number;

  @ManyToOne(() => Customer, { nullable: false, eager: false })
  @JoinColumn({ name: 'khach_hang_id' })
  khachHang: Customer;

  @Column({ name: 'loai_giao_dich', length: 20 })
  loaiGiaoDich: 'earn' | 'redeem' | 'expire' | 'adjust';

  @Column({ name: 'diem' })
  diem: number;

  @Column({ name: 'so_du_truoc' })
  soDuTruoc: number;

  @Column({ name: 'so_du_sau' })
  soDuSau: number;

  @Column({ name: 'mo_ta', length: 500 })
  moTa: string;

  @Column({ name: 'loai_tham_chieu', length: 50, nullable: true })
  loaiThamChieu: 'don_hang' | 'loyalty_redemption' | 'admin_adjust' | null;

  @Column({ name: 'tham_chieu_id', nullable: true })
  thamChieuId: number | null;

  @CreateDateColumn({ name: 'ngay_tao' })
  ngayTao: Date;
}
