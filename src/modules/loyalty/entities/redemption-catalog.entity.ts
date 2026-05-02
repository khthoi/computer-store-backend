import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Promotion } from '../../promotions/entities/promotion.entity';

@Entity('loyalty_redemption_catalog')
export class RedemptionCatalog {
  @PrimaryGeneratedColumn({ name: 'catalog_id' })
  id: number;

  @Column({ name: 'ten', length: 300 })
  ten: string;

  @Column({ name: 'mo_ta', type: 'text', nullable: true })
  moTa: string | null;

  @Column({ name: 'diem_can' })
  diemCan: number;

  @Column({ name: 'promotion_id' })
  promotionId: number;

  @ManyToOne(() => Promotion, { nullable: false, eager: false })
  @JoinColumn({ name: 'promotion_id' })
  promotion: Promotion;

  @Column({ name: 'la_hoat_dong', type: 'boolean', default: true })
  laHoatDong: boolean;

  @Column({ name: 'gioi_han_ton_kho', nullable: true })
  gioiHanTonKho: number | null;

  @Column({ name: 'so_da_doi', default: 0 })
  soDaDoi: number;

  @Column({ name: 'hieu_luc_tu', type: 'datetime', nullable: true })
  hieuLucTu: Date | null;

  @Column({ name: 'hieu_luc_den', type: 'datetime', nullable: true })
  hieuLucDen: Date | null;

  @CreateDateColumn({ name: 'ngay_tao' })
  ngayTao: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  ngayCapNhat: Date;
}
