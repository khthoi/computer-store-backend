import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('danh_muc')
@Index('idx_dm_parent', ['danhMucChaId'])
@Index('idx_dm_trangthai', ['trangThai'])
export class Category {
  @PrimaryGeneratedColumn({ name: 'danh_muc_id' })
  id: number;

  @Column({ name: 'ten_danh_muc', length: 200 })
  tenDanhMuc: string;

  @Column({ length: 200 })
  @Index('uq_dm_slug', { unique: true })
  slug: string;

  @Column({ name: 'node_type', length: 20, default: 'category' })
  nodeType: string; // 'category' | 'filter' | 'label'

  @Column({ name: 'filter_params', type: 'json', nullable: true })
  filterParams: Record<string, unknown> | null;

  @Column({ name: 'danh_muc_cha_id', nullable: true })
  danhMucChaId: number | null;

  @Column({ name: 'cap_do_hien_thi', type: 'smallint', default: 0 })
  capDoHienThi: number;

  @Column({ name: 'thu_tu_hien_thi', type: 'smallint', default: 0 })
  thuTuHienThi: number;

  @Column({ name: 'hinh_anh', length: 500, nullable: true })
  hinhAnh: string | null;

  @Column({ name: 'trang_thai', length: 10, default: 'Hien' })
  trangThai: string; // 'Hien' | 'An'

  @Column({ name: 'mo_ta', type: 'text', nullable: true })
  moTa: string | null;

  @Column({ name: 'badge_text', length: 30, nullable: true })
  badgeText: string | null;

  @Column({ name: 'badge_bg', length: 7, nullable: true })
  badgeBg: string | null;

  @Column({ name: 'badge_fg', length: 7, nullable: true })
  badgeFg: string | null;

  @Column({ name: 'asset_id', nullable: true })
  assetId: number | null;

  @Column({ name: 'image_alt', length: 200, nullable: true })
  imageAlt: string | null;

  @ManyToOne(() => Category, (c) => c.children, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'danh_muc_cha_id' })
  parent: Category | null;

  @OneToMany(() => Category, (c) => c.parent)
  children: Category[];
}
