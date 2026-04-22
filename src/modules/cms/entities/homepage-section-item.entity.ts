import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { HomepageSection } from './homepage-section.entity';

@Entity('homepage_section_item')
export class HomepageSectionItem {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'section_id' })
  sectionId: number;

  @Column({ name: 'phien_ban_id' })
  variantId: number;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @ManyToOne(() => HomepageSection, (s) => s.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'section_id' })
  section: HomepageSection;
}
