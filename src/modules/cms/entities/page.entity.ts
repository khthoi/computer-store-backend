import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('trang_noi_dung')
export class Page {
  @PrimaryGeneratedColumn({ name: 'trang_id' })
  id: number;

  @Column({ name: 'loai', length: 60 })
  type: string;

  @Column({ name: 'slug', length: 255, unique: true })
  slug: string;

  @Column({ name: 'tieu_de', length: 255 })
  title: string;

  @Column({ name: 'noi_dung', type: 'longtext' })
  content: string;

  @Column({
    name: 'trang_thai',
    type: 'enum',
    enum: ['nhap', 'da_xuat_ban', 'an'],
    default: 'nhap',
  })
  status: string;

  @Column({ name: 'thu_tu', default: 0 })
  sortOrder: number;

  @Column({ name: 'hien_trong_footer', default: false })
  showInFooter: boolean;

  @Column({ name: 'meta_title', length: 255, nullable: true })
  metaTitle: string | null;

  @Column({ name: 'meta_description', length: 500, nullable: true })
  metaDescription: string | null;

  @Column({ name: 'ngay_xuat_ban', type: 'datetime', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'nguoi_tao_id', nullable: true })
  createdById: number | null;

  @Column({ name: 'nguoi_cap_nhat_id', nullable: true })
  updatedById: number | null;

  @CreateDateColumn({ name: 'ngay_tao' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  updatedAt: Date;
}
