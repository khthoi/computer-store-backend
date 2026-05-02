import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ExportReceipt } from './export-receipt.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';

@Entity('chi_tiet_phieu_xuat')
@Index('idx_ctpx_phieu', ['phieuXuatId'])
@Index('idx_ctpx_phienban', ['phienBanId'])
export class ExportReceiptItem {
  @PrimaryGeneratedColumn({ name: 'chi_tiet_xuat_id' })
  id: number;

  @Column({ name: 'phieu_xuat_id' })
  phieuXuatId: number;

  @ManyToOne(() => ExportReceipt, (r) => r.items, { nullable: false, eager: false })
  @JoinColumn({ name: 'phieu_xuat_id' })
  receipt: ExportReceipt;

  @Column({ name: 'phien_ban_id' })
  phienBanId: number;

  @ManyToOne(() => ProductVariant, { nullable: false, eager: false })
  @JoinColumn({ name: 'phien_ban_id' })
  phienBan: ProductVariant;

  @Column({ name: 'so_luong' })
  soLuong: number;

  @Column({ name: 'gia_von_tb', type: 'decimal', precision: 18, scale: 2, default: 0 })
  giaVonTb: number;

  @Column({ name: 'tong_gia_von', type: 'decimal', precision: 18, scale: 2, default: 0 })
  tongGiaVon: number;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string | null;
}
