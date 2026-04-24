import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('report_job_log')
export class ReportJobLog {
  @PrimaryGeneratedColumn({ name: 'log_id' })
  id: number;

  @Column({ name: 'ten_job', length: 60 })
  jobName: string;

  @Column({ name: 'trang_thai', length: 20 })
  status: string;

  @Column({ name: 'bat_dau_tai', type: 'timestamp' })
  startedAt: Date;

  @Column({ name: 'ket_thuc_tai', type: 'timestamp', nullable: true })
  finishedAt: Date | null;

  @Column({ name: 'thoi_gian_ms', type: 'int', nullable: true })
  durationMs: number | null;

  @Column({ name: 'so_ban_ghi', type: 'int', nullable: true })
  rowsProcessed: number | null;

  @Column({ name: 'loi_message', type: 'text', nullable: true })
  errorMessage: string | null;
}
