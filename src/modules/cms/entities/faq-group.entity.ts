import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { FaqItem } from './faq-item.entity';

@Entity('faq_nhom')
export class FaqGroup {
  @PrimaryGeneratedColumn({ name: 'nhom_id' })
  id: number;

  @Column({ name: 'ten', length: 255 })
  name: string;

  @Column({ name: 'slug', length: 255, unique: true })
  slug: string;

  @Column({ name: 'mo_ta', length: 500, nullable: true })
  description: string | null;

  @Column({ name: 'thu_tu', default: 0 })
  sortOrder: number;

  @Column({ name: 'la_hien_thi', default: true })
  isVisible: boolean;

  @CreateDateColumn({ name: 'ngay_tao' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  updatedAt: Date;

  @OneToMany(() => FaqItem, (item) => item.group)
  items: FaqItem[];
}
