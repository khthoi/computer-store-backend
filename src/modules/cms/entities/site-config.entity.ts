import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('site_config')
export class SiteConfig {
  @PrimaryColumn({ name: 'config_key', type: 'varchar', length: 100 })
  key: string;

  @Column({ name: 'config_value', type: 'longtext' })
  value: string;

  @Column({ name: 'nguoi_cap_nhat_id', nullable: true })
  updatedById: number | null;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  updatedAt: Date;
}
