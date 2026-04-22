import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('thong_bao_tu_dong_cau_hinh')
export class AutoNotificationConfig {
  @PrimaryGeneratedColumn({ name: 'cau_hinh_id' })
  id: number;

  @Column({ name: 'trigger_key', length: 100, unique: true })
  triggerKey: string;

  @Column({ name: 'ten_hien_thi', length: 255 })
  displayName: string;

  @Column({ name: 'mo_ta', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'kenh_gui', type: 'json' })
  channels: string[];

  @Column({ name: 'template_tieu_de', length: 300 })
  templateTitle: string;

  @Column({ name: 'template_noi_dung', type: 'text' })
  templateContent: string;

  @Column({ name: 'delay_giay', type: 'int', default: 0 })
  delaySeconds: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'cap_nhat_boi', type: 'int', nullable: true })
  updatedById: number | null;

  @CreateDateColumn({ name: 'ngay_tao' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  updatedAt: Date;
}
