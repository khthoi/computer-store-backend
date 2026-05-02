import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { HomepageSectionItem } from './homepage-section-item.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('homepage_section')
export class HomepageSection {
  @PrimaryGeneratedColumn({ name: 'section_id' })
  id: number;

  @Column({ name: 'title', length: 255 })
  title: string;

  @Column({ name: 'subtitle', length: 255, nullable: true })
  subtitle: string | null;

  @Column({ name: 'view_all_url', type: 'text', nullable: true })
  viewAllUrl: string | null;

  @Column({
    name: 'type',
    type: 'enum',
    enum: ['category', 'promotion', 'brand', 'manual', 'new_arrivals', 'best_selling'],
  })
  type: string;

  @Column({ name: 'source_config', type: 'json', nullable: true })
  sourceConfig: Record<string, unknown> | null;

  @Column({
    name: 'sort_by',
    type: 'enum',
    enum: ['price_asc', 'price_desc', 'newest', 'best_selling', 'rating'],
    nullable: true,
  })
  sortBy: string | null;

  @Column({ name: 'max_products', default: 8 })
  maxProducts: number;

  @Column({
    name: 'layout',
    type: 'enum',
    enum: ['carousel', 'grid_2x3', 'grid_3x2', 'grid_4'],
    default: 'carousel',
  })
  layout: string;

  @Column({ name: 'badge_label', length: 100, nullable: true })
  badgeLabel: string | null;

  @Column({ name: 'badge_color', length: 20, nullable: true })
  badgeColor: string | null;

  @Column({ name: 'is_visible', default: true })
  isVisible: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'ngay_bat_dau', type: 'datetime', nullable: true })
  startAt: Date | null;

  @Column({ name: 'ngay_ket_thuc', type: 'datetime', nullable: true })
  endAt: Date | null;

  @Column({ name: 'nguoi_tao_id', nullable: true })
  createdById: number | null;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'nguoi_tao_id' })
  createdBy: Employee | null;

  @CreateDateColumn({ name: 'ngay_tao' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  updatedAt: Date;

  @OneToMany(() => HomepageSectionItem, (item) => item.section, { cascade: true })
  items: HomepageSectionItem[];
}
