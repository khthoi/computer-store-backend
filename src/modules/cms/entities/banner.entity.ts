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

  @Column({ name: 'subtitle', length: 255, nullable: true })
  subtitle: string | null;

  @Column({ name: 'asset_id', nullable: true })
  assetId: number | null;

  @Column({ name: 'url_hinh_anh', type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ name: 'alt_text', length: 255, nullable: true })
  altText: string | null;

  @Column({ name: 'asset_id_mobile', nullable: true })
  assetIdMobile: number | null;

  @Column({ name: 'url_hinh_anh_mobile', type: 'text', nullable: true })
  imageUrlMobile: string | null;

  @Column({ name: 'overlay_color', length: 20, nullable: true })
  overlayColor: string | null;

  @Column({ name: 'overlay_opacity', type: 'decimal', precision: 3, scale: 2, nullable: true })
  overlayOpacity: number | null;

  @Column({ name: 'url_dich_den', type: 'text', nullable: true })
  targetUrl: string | null;

  @Column({ name: 'button_text', length: 100, nullable: true })
  buttonText: string | null;

  @Column({ name: 'button_url', type: 'text', nullable: true })
  buttonUrl: string | null;

  @Column({
    name: 'vi_tri_hien_thi',
    type: 'enum',
    enum: ['TrangChu', 'TrangDanhMuc', 'TrangSanPham', 'DauTrang', 'CuaTrang', 'Popup', 'SideBanner'],
    default: 'TrangChu',
  })
  position: string;

  @Column({ name: 'thu_tu_hien_thi', default: 0 })
  sortOrder: number;

  @Column({ name: 'ngay_bat_dau', type: 'datetime', nullable: true })
  startAt: Date | null;

  @Column({ name: 'ngay_ket_thuc', type: 'datetime', nullable: true })
  endAt: Date | null;

  @Column({
    name: 'trang_thai',
    type: 'enum',
    enum: ['DangHienThi', 'An', 'HetHan'],
    default: 'DangHienThi',
  })
  status: string;

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
