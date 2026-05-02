import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('thuong_hieu')
export class Brand {
  @PrimaryGeneratedColumn({ name: 'thuong_hieu_id' })
  id: number;

  @Column({ name: 'ten_thuong_hieu', length: 200 })
  @Index('uq_th_ten', { unique: true })
  tenThuongHieu: string;

  @Column({ length: 200, nullable: true })
  @Index('uq_th_slug', { unique: true })
  slug: string | null;

  @Column({ type: 'text', nullable: true })
  logo: string | null;

  @Column({ name: 'logo_alt', length: 300, nullable: true })
  logoAlt: string | null;

  @Column({ name: 'mo_ta', type: 'text', nullable: true })
  moTa: string | null;

  @Column({ name: 'trang_thai', length: 10, default: 'HienThi' })
  trangThai: string; // 'HienThi' | 'An'

  @Column({ name: 'website_url', type: 'text', nullable: true })
  websiteUrl: string | null;

  @Column({ name: 'asset_id_logo', nullable: true })
  assetIdLogo: number | null;
}
