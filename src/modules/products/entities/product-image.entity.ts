import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProductVariant } from './product-variant.entity';
import { MediaAsset } from '../../media/entities/media-asset.entity';

export enum LoaiAnh {
  AnhChinh = 'AnhChinh',
  AnhPhu = 'AnhPhu',
}

@Entity('hinh_anh_san_pham')
@Index('idx_hasp_phienban', ['phienBanId'])
export class ProductImage {
  @PrimaryGeneratedColumn({ name: 'hinh_anh_id' })
  id: number;

  @Column({ name: 'phien_ban_id' })
  phienBanId: number;

  @Column({ name: 'url_hinh_anh', type: 'text' })
  urlHinhAnh: string;

  @Column({ name: 'loai_anh', type: 'enum', enum: LoaiAnh, default: LoaiAnh.AnhPhu })
  loaiAnh: LoaiAnh;

  @Column({ name: 'thu_tu', type: 'smallint', default: 0 })
  thuTu: number;

  @Column({ name: 'alt_text', length: 300, nullable: true })
  altText: string | null;

  @Column({ name: 'asset_id', nullable: true })
  assetId: number | null;

  @ManyToOne(() => MediaAsset, { nullable: true, eager: false })
  @JoinColumn({ name: 'asset_id' })
  asset: MediaAsset | null;

  @ManyToOne(() => ProductVariant, (v) => v.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'phien_ban_id' })
  variant: ProductVariant;
}
