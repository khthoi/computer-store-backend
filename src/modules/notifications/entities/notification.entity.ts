import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Customer } from '../../users/entities/customer.entity';

@Entity('thong_bao')
export class Notification {
  @PrimaryGeneratedColumn({ name: 'thong_bao_id' })
  id: number;

  @Column({ name: 'khach_hang_id' })
  customerId: number;

  @ManyToOne(() => Customer, { nullable: false, eager: false })
  @JoinColumn({ name: 'khach_hang_id' })
  customer: Customer;

  @Column({ name: 'loai_thong_bao', length: 30 })
  type: string;

  @Column({ name: 'tieu_de', length: 300 })
  title: string;

  @Column({ name: 'noi_dung', type: 'text' })
  content: string;

  @Column({ name: 'kenh_gui', length: 25 })
  channel: string; // 'Email'|'SMS'|'Push'

  @Column({ name: 'trang_thai', length: 20, default: 'ChuaGui' })
  status: string;

  @Column({ name: 'da_doc', type: 'boolean', default: false })
  isRead: boolean;

  @Column({ name: 'entity_lien_quan', length: 50, nullable: true })
  relatedEntity: string | null;

  @Column({ name: 'entity_lien_quan_id', type: 'int', nullable: true })
  relatedEntityId: number | null;

  @CreateDateColumn({ name: 'ngay_tao' })
  createdAt: Date;
}
