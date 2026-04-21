import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { MediaAsset } from './media-asset.entity';

@Entity('media_thu_muc')
export class MediaFolder {
  @PrimaryGeneratedColumn({ name: 'thu_muc_id' })
  id: number;

  @Column({ name: 'ten_hien_thi', length: 100 })
  tenHienThi: string;

  @Column({ name: 'duong_dan', length: 255, unique: true })
  duongDan: string;

  @Column({ name: 'mo_ta', length: 500, nullable: true })
  moTa: string | null;

  @Column({ name: 'loai_cho_phep', length: 20, default: 'all' })
  loaiChoPhep: string; // 'all' | 'image' | 'video' | 'raw'

  @Column({ name: 'thu_tu', default: 0 })
  thuTu: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'ngay_tao' })
  ngayTao: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  ngayCapNhat: Date;

  @OneToMany(() => MediaAsset, (asset) => asset.thuMucObj)
  assets: MediaAsset[];
}
