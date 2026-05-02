import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BuildSlot } from './build-slot.entity';

@Entity('buildpc_quy_tac_tuong_thich')
export class CompatibilityRule {
  @PrimaryGeneratedColumn({ name: 'quy_tac_id' })
  id: number;

  @Column({ name: 'ten_quy_tac', length: 200 })
  tenQuyTac: string;

  @Column({ name: 'slot_nguon_id' })
  slotNguonId: number;

  @ManyToOne(() => BuildSlot, { nullable: false, eager: false })
  @JoinColumn({ name: 'slot_nguon_id' })
  slotNguon: BuildSlot;

  @Column({ name: 'ma_kt_nguon', length: 50 })
  maKtNguon: string;

  @Column({ name: 'slot_dich_id', nullable: true })
  slotDichId: number | null;

  @ManyToOne(() => BuildSlot, { nullable: true, eager: false })
  @JoinColumn({ name: 'slot_dich_id' })
  slotDich: BuildSlot | null;

  @Column({ name: 'ma_kt_dich', length: 50 })
  maKtDich: string;

  @Column({ name: 'loai_kiem_tra', length: 20 })
  loaiKiemTra: string; // 'exact_match' | 'contains' | 'min_sum' | 'min_value'

  @Column({ name: 'he_so', type: 'decimal', precision: 4, scale: 2, default: 1.0 })
  heSo: number;

  @Column({ name: 'thong_bao_loi', type: 'text' })
  thongBaoLoi: string;

  @Column({ name: 'is_active', type: 'tinyint', default: 1 })
  isActive: boolean;

  @Column({ name: 'thu_tu', type: 'smallint', default: 0 })
  thuTu: number;
}
