import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('report_retention_cohort')
export class RetentionCohort {
  // Format: YYYY-MM
  @PrimaryColumn({ name: 'cohort_thang', type: 'char', length: 7 })
  cohortMonth: string;

  @Column({ name: 'so_khach_ban_dau', type: 'int' })
  initialCustomers: number;

  @Column({ name: 'm0_pct', type: 'tinyint', default: 100 })
  m0: number;

  @Column({ name: 'm1_pct', type: 'tinyint', nullable: true })
  m1: number | null;

  @Column({ name: 'm2_pct', type: 'tinyint', nullable: true })
  m2: number | null;

  @Column({ name: 'm3_pct', type: 'tinyint', nullable: true })
  m3: number | null;

  @Column({ name: 'm4_pct', type: 'tinyint', nullable: true })
  m4: number | null;

  @Column({ name: 'm5_pct', type: 'tinyint', nullable: true })
  m5: number | null;

  @Column({ name: 'm6_pct', type: 'tinyint', nullable: true })
  m6: number | null;

  @Column({ name: 'm7_pct', type: 'tinyint', nullable: true })
  m7: number | null;

  @Column({ name: 'm8_pct', type: 'tinyint', nullable: true })
  m8: number | null;

  @Column({ name: 'm9_pct', type: 'tinyint', nullable: true })
  m9: number | null;

  @Column({ name: 'm10_pct', type: 'tinyint', nullable: true })
  m10: number | null;

  @Column({ name: 'm11_pct', type: 'tinyint', nullable: true })
  m11: number | null;

  @Column({ name: 'm12_pct', type: 'tinyint', nullable: true })
  m12: number | null;

  @Column({ name: 'tinh_toan_tai', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  computedAt: Date;
}
