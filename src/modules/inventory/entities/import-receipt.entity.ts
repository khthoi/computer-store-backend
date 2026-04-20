import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, Index } from 'typeorm';
import { ImportReceiptItem } from './import-receipt-item.entity';

export type TrangThaiPhieu = 'ChoDuyet' | 'DaDuyet' | 'TuChoi';

@Entity('phieu_nhap_kho')
export class ImportReceipt {
  @PrimaryGeneratedColumn({ name: 'phieu_nhap_id' })
  id: number;

  @Column({ name: 'nha_cung_cap_id' })
  nhaCungCapId: number;

  @Column({ name: 'kho_id' })
  khoId: number;

  @Column({ name: 'nhan_vien_nhap_id' })
  nhanVienNhapId: number;

  @Column({ name: 'ma_phieu_nhap', length: 255 })
  @Index('uq_pnk_maphieu', { unique: true })
  maPhieuNhap: string;

  @Column({ name: 'trang_thai', length: 50, default: 'ChoDuyet' })
  trangThai: TrangThaiPhieu;

  @CreateDateColumn({ name: 'ngay_nhap' })
  ngayNhap: Date;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string | null;

  @OneToMany(() => ImportReceiptItem, (item) => item.receipt, { cascade: true })
  items: ImportReceiptItem[];
}
