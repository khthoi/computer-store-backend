import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('report_rfm_snapshot')
export class RfmSnapshot {
  @PrimaryColumn({ name: 'khach_hang_id', type: 'int' })
  customerId: number;

  @Column({ name: 'recency_days', type: 'int' })
  recencyDays: number;

  @Column({ name: 'ngay_mua_cuoi', type: 'date', nullable: true })
  lastPurchaseDate: string | null;

  @Column({ name: 'frequency', type: 'int', default: 0 })
  frequency: number;

  @Column({ name: 'monetary', type: 'bigint', default: 0 })
  monetary: number;

  @Column({ name: 'rfm_r_score', type: 'tinyint' })
  rScore: number;

  @Column({ name: 'rfm_f_score', type: 'tinyint' })
  fScore: number;

  @Column({ name: 'rfm_m_score', type: 'tinyint' })
  mScore: number;

  @Column({ name: 'segment', length: 30 })
  segment: string;

  @Column({ name: 'ngay_dang_ky', type: 'date' })
  registeredAt: string;

  @Column({ name: 'so_don_hoan_tra', type: 'int', default: 0 })
  returnCount: number;

  @Column({ name: 'gia_tri_don_tb', type: 'int', default: 0 })
  avgOrderValue: number;

  @Column({ name: 'tinh_toan_tai', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  computedAt: Date;
}
