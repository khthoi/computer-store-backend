import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ImportReceipt } from './import-receipt.entity';

@Entity('chi_tiet_phieu_nhap')
export class ImportReceiptItem {
  @PrimaryGeneratedColumn({ name: 'chi_tiet_phieu_id' })
  id: number;

  @Column({ name: 'phieu_nhap_id' })
  phieuNhapId: number;

  @Column({ name: 'phien_ban_id' })
  phienBanId: number;

  @Column({ name: 'so_luong_du_kien' })
  soLuongDuKien: number;

  @Column({ name: 'so_luong_thuc_nhap', nullable: true })
  soLuongThucNhap: number | null;

  @Column({ name: 'don_gia_nhap', type: 'decimal', precision: 18, scale: 2, nullable: true })
  donGiaNhap: number | null;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string | null;

  @ManyToOne(() => ImportReceipt, (r) => r.items)
  @JoinColumn({ name: 'phieu_nhap_id' })
  receipt: ImportReceipt;
}
