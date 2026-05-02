import { Entity, PrimaryColumn, Column, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('site_config')
export class SiteConfig {
  @PrimaryColumn({ name: 'config_key', type: 'varchar', length: 100 })
  key: string;

  @Column({ name: 'config_value', type: 'longtext' })
  value: string;

  @Column({ name: 'nguoi_cap_nhat_id', nullable: true })
  updatedById: number | null;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'nguoi_cap_nhat_id' })
  updatedBy: Employee | null;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  updatedAt: Date;
}
