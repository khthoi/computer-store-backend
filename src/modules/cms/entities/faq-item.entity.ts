import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FaqGroup } from './faq-group.entity';

@Entity('faq_item')
export class FaqItem {
  @PrimaryGeneratedColumn({ name: 'item_id' })
  id: number;

  @Column({ name: 'nhom_id' })
  groupId: number;

  @Column({ name: 'cau_hoi', length: 500 })
  question: string;

  @Column({ name: 'tra_loi', type: 'text' })
  answer: string;

  @Column({ name: 'thu_tu', default: 0 })
  sortOrder: number;

  @Column({ name: 'la_hien_thi', default: true })
  isVisible: boolean;

  @Column({ name: 'luot_xem', default: 0 })
  viewCount: number;

  @Column({ name: 'luot_huu_ich', default: 0 })
  helpfulCount: number;

  @CreateDateColumn({ name: 'ngay_tao' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  updatedAt: Date;

  @ManyToOne(() => FaqGroup, (g) => g.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nhom_id' })
  group: FaqGroup;
}
