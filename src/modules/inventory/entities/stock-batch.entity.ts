import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ProductVariant } from '../../products/entities/product-variant.entity';
import { ImportReceiptItem } from './import-receipt-item.entity';
import { Employee } from '../../employees/entities/employee.entity';

export type TrangThaiBatch = 'con_hang' | 'da_het';

@Entity('lo_hang')
@Index('idx_lo_phienban', ['phienBanId'])
@Index('idx_lo_phienban_trangThai', ['phienBanId', 'trangThai'])
export class StockBatch {
  @PrimaryGeneratedColumn({ name: 'lo_id' })
  id: number;

  @Column({ name: 'ma_lo', length: 50, unique: true })
  maLo: string;

  @Column({ name: 'chi_tiet_phieu_id', nullable: true })
  chiTietPhieuId: number | null;

  @ManyToOne(() => ImportReceiptItem, { nullable: true, eager: false })
  @JoinColumn({ name: 'chi_tiet_phieu_id' })
  chiTietPhieu: ImportReceiptItem;

  @Column({ name: 'phien_ban_id' })
  phienBanId: number;

  @ManyToOne(() => ProductVariant, { nullable: false, eager: false })
  @JoinColumn({ name: 'phien_ban_id' })
  phienBan: ProductVariant;

  /** Unit cost copied from ImportReceiptItem — immutable after creation */
  @Column({ name: 'don_gia_nhap', type: 'decimal', precision: 18, scale: 2, default: 0 })
  donGiaNhap: number;

  /** Original quantity when the batch was created — immutable */
  @Column({ name: 'so_luong_nhap' })
  soLuongNhap: number;

  /** Remaining quantity — decremented on each sale/dispatch */
  @Column({ name: 'so_luong_con_lai' })
  soLuongConLai: number;

  @CreateDateColumn({ name: 'ngay_nhap' })
  ngayNhap: Date;

  @Column({ name: 'trang_thai', length: 20, default: 'con_hang' })
  trangThai: TrangThaiBatch;

  /** Only set for ADJ batches (no import receipt). Normal batches track creator via chiTietPhieu.receipt.nhanVienNhap */
  @Column({ name: 'nguoi_tao_id', nullable: true })
  nguoiTaoId: number | null;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'nguoi_tao_id' })
  nguoiTao: Employee | null;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string | null;
}
