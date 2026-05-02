import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Index, OneToOne, JoinColumn } from 'typeorm';
import { ProductVariant } from '../../products/entities/product-variant.entity';

@Entity('ton_kho')
@Index('uq_tk_phienban', ['phienBanId'], { unique: true })
export class StockLevel {
  @PrimaryGeneratedColumn({ name: 'ton_kho_id' })
  id: number;

  @Column({ name: 'phien_ban_id' })
  phienBanId: number;

  @OneToOne(() => ProductVariant, { nullable: false, eager: false })
  @JoinColumn({ name: 'phien_ban_id' })
  phienBan: ProductVariant;

  @Column({ name: 'so_luong_ton', default: 0 })
  soLuongTon: number;

  @Column({ name: 'nguong_canh_bao', default: 5 })
  nguongCanhBao: number;

  /** Weighted average cost — recalculated on each new batch import */
  @Column({ name: 'gia_von_trung_binh', type: 'decimal', precision: 18, scale: 2, default: 0 })
  giaVonTrungBinh: number;

  /** Quantity threshold that triggers a reorder alert — can be set manually or auto-computed */
  @Column({ name: 'reorder_point', default: 0 })
  reorderPoint: number;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  ngayCapNhat: Date;
}
