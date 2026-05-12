import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('banner_noi_dung')
export class Banner {
  @PrimaryGeneratedColumn({ name: 'banner_id' })
  id: number;

  @Column({ name: 'tieu_de', length: 255 })
  title: string;

  @Column({ name: 'asset_id', nullable: true })
  assetId: number | null;

  @Column({ name: 'url_hinh_anh', type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ name: 'alt_text', length: 255, nullable: true })
  altText: string | null;

  @Column({ name: 'caption', type: 'text', nullable: true })
  caption: string | null;

  @Column({ name: 'asset_id_mobile', nullable: true })
  assetIdMobile: number | null;

  @Column({ name: 'url_hinh_anh_mobile', type: 'text', nullable: true })
  mobileImageUrl: string | null;

  @Column({
    name: 'vi_tri_side_banner',
    type: 'enum',
    enum: ['left', 'right'],
    nullable: true,
  })
  sidePlacement: 'left' | 'right' | null;

  @Column({ name: 'url_dich_den', type: 'text', nullable: true })
  linkUrl: string | null;

  @Column({ name: 'link_target', length: 10, default: '_self' })
  linkTarget: string;

  @Column({ name: 'button_text', length: 100, nullable: true })
  ctaLabel: string | null;

  @Column({ name: 'button_url', type: 'text', nullable: true })
  ctaUrl: string | null;

  @Column({ name: 'overlay_text', type: 'text', nullable: true })
  overlayText: string | null;

  @Column({ name: 'overlay_subtext', type: 'text', nullable: true })
  overlaySubtext: string | null;

  @Column({ name: 'badge', length: 100, nullable: true })
  badge: string | null;

  @Column({ name: 'badge_color', length: 20, nullable: true })
  badgeColor: string | null;

  @Column({ name: 'badge_text_color', length: 20, nullable: true })
  badgeTextColor: string | null;

  @Column({ name: 'grid_x', nullable: true })
  gridX: number | null;

  @Column({ name: 'grid_y', nullable: true })
  gridY: number | null;

  @Column({ name: 'grid_w', nullable: true })
  gridW: number | null;

  @Column({ name: 'grid_h', nullable: true })
  gridH: number | null;

  @Column({
    name: 'vi_tri_hien_thi',
    type: 'enum',
    enum: ['homepage_hero', 'homepage_hero_slider', 'homepage_small', 'side_banner', 'promotions_banner'],
    default: 'homepage_hero',
  })
  position: string;

  @Column({ name: 'thu_tu_hien_thi', default: 0 })
  sortOrder: number;

  @Column({ name: 'kich_hoat_hien_thi', type: 'boolean', nullable: true, default: null })
  isEnabled: boolean | null;

  @Column({ name: 'ngay_bat_dau', type: 'datetime', nullable: true })
  startDate: Date | null;

  @Column({ name: 'ngay_ket_thuc', type: 'datetime', nullable: true })
  endDate: Date | null;

  @Column({
    name: 'trang_thai',
    type: 'enum',
    enum: ['draft', 'active', 'scheduled', 'ended'],
    default: 'draft',
  })
  status: string;

  @Column({ name: 'click_count', default: 0 })
  clickCount: number;

  @Column({ name: 'impression_count', default: 0 })
  impressionCount: number;

  @Column({ name: 'nguoi_tao_id', nullable: true })
  createdById: number | null;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'nguoi_tao_id' })
  createdBy: Employee | null;

  @Column({ name: 'nguoi_cap_nhat_id', nullable: true })
  updatedById: number | null;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'nguoi_cap_nhat_id' })
  updatedBy: Employee | null;

  @CreateDateColumn({ name: 'ngay_tao' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  updatedAt: Date;
}
