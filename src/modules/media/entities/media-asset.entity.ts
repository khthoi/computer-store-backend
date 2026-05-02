import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MediaFolder } from './media-folder.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('media_asset')
export class MediaAsset {
  @PrimaryGeneratedColumn({ name: 'asset_id' })
  id: number;

  @Column({ name: 'cloudinary_id', length: 500 })
  @Index('uq_media_cloudinary_id', { unique: true })
  cloudinaryId: string;

  @Column({ name: 'cloudinary_ver' })
  cloudinaryVer: number;

  @Column({ name: 'url_goc', type: 'text' })
  urlGoc: string;

  @Column({ name: 'ten_file_goc', length: 255 })
  tenFileGoc: string;

  @Column({ name: 'loai_file', length: 20 })
  loaiFile: string; // 'image' | 'video' | 'raw'

  @Column({ name: 'mime_type', length: 100 })
  mimeType: string;

  @Column({ name: 'kich_thuoc_byte' })
  kichThuocByte: number;

  @Column({ name: 'chieu_rong', nullable: true })
  chieuRong: number | null;

  @Column({ name: 'chieu_cao', nullable: true })
  chieuCao: number | null;

  @Column({ name: 'alt_text', type: 'text', nullable: true })
  altText: string | null;

  @Column({ type: 'text', nullable: true })
  caption: string | null;

  @Column({ name: 'thu_muc', length: 255, nullable: true })
  thuMuc: string | null;

  @Column({ name: 'thu_muc_id', nullable: true })
  thuMucId: number | null;

  @ManyToOne(() => MediaFolder, (folder) => folder.assets, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'thu_muc_id' })
  thuMucObj: MediaFolder | null;

  @Column({ type: 'json', nullable: true })
  tags: string[] | null;

  @Column({ name: 'so_lan_su_dung', default: 0 })
  soLanSuDung: number;

  @Column({ name: 'trang_thai', length: 20, default: 'active' })
  trangThai: string; // 'active' | 'archived'

  @Column({ name: 'pham_vi', length: 10, default: 'public' })
  phamVi: string; // 'public' | 'private'

  @Column({ name: 'nguoi_upload_id' })
  nguoiUploadId: number;

  @ManyToOne(() => Employee, { nullable: false, eager: false })
  @JoinColumn({ name: 'nguoi_upload_id' })
  nguoiUpload: Employee;

  @CreateDateColumn({ name: 'ngay_upload' })
  ngayUpload: Date;
}
