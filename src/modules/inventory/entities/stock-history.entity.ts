import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ProductVariant } from '../../products/entities/product-variant.entity';
import { Order } from '../../orders/entities/order.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { StockBatch } from './stock-batch.entity';
import { ExportReceipt } from './export-receipt.entity';

export type LoaiGiaoDich = 'Nhap' | 'Xuat' | 'HoanTra' | 'Huy' | 'DieuChinh';

@Entity('lich_su_nhap_xuat')
@Index('idx_lsnx_phienban', ['phienBanId'])
@Index('idx_lsnx_donhang', ['donHangId'])
@Index('idx_history_variant_time', ['phienBanId', 'thoiDiem'])
export class StockHistory {
  @PrimaryGeneratedColumn({ name: 'lich_su_nx_id' })
  id: number;

  @Column({ name: 'phien_ban_id' })
  phienBanId: number;

  @ManyToOne(() => ProductVariant, { nullable: false, eager: false })
  @JoinColumn({ name: 'phien_ban_id' })
  phienBan: ProductVariant;

  @Column({ name: 'loai_giao_dich', length: 20 })
  loaiGiaoDich: LoaiGiaoDich;

  @Column({ name: 'so_luong' })
  soLuong: number;

  @Column({ name: 'don_hang_id', nullable: true })
  donHangId: number | null;

  @ManyToOne(() => Order, { nullable: true, eager: false })
  @JoinColumn({ name: 'don_hang_id' })
  donHang: Order | null;

  @Column({ name: 'phieu_nhap_id', nullable: true })
  phieuNhapId: number | null;

  @Column({ name: 'phieu_xuat_id', nullable: true })
  phieuXuatId: number | null;

  @ManyToOne(() => ExportReceipt, { nullable: true, eager: false, createForeignKeyConstraints: false })
  @JoinColumn({ name: 'phieu_xuat_id' })
  phieuXuat: ExportReceipt | null;

  @Column({ name: 'nguoi_thuc_hien_id', nullable: true })
  nguoiThucHienId: number | null;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'nguoi_thuc_hien_id' })
  nguoiThucHien: Employee | null;

  /** Batch (lô hàng) affected by this movement */
  @Column({ name: 'lo_id', nullable: true })
  loId: number | null;

  @ManyToOne(() => StockBatch, { nullable: true, eager: false, createForeignKeyConstraints: false })
  @JoinColumn({ name: 'lo_id' })
  lo: StockBatch | null;

  /** Unit cost at time of movement — used for COGS reporting */
  @Column({ name: 'gia_von', type: 'decimal', precision: 18, scale: 2, nullable: true })
  giaVon: number | null;

  @CreateDateColumn({ name: 'thoi_diem' })
  thoiDiem: Date;

  @Column({ name: 'so_luong_truoc', nullable: true })
  soLuongTruoc: number | null;

  @Column({ name: 'so_luong_sau', nullable: true })
  soLuongSau: number | null;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string | null;
}
