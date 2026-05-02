import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ImportReceiptItem } from './import-receipt-item.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { Employee } from '../../employees/entities/employee.entity';

export type TrangThaiPhieu = 'ChoDuyet' | 'DaDuyet' | 'TiepNhanMot' | 'TuChoi';
export type LoaiPhieuNhap = 'NhapMua' | 'NhapHoanTra' | 'NhapBaoHanh';

@Entity('phieu_nhap_kho')
export class ImportReceipt {
  @PrimaryGeneratedColumn({ name: 'phieu_nhap_id' })
  id: number;

  @Column({ name: 'loai_phieu', length: 20, default: 'NhapMua' })
  loaiPhieu: LoaiPhieuNhap;

  @Column({ name: 'nha_cung_cap_id', nullable: true })
  nhaCungCapId: number | null;

  @ManyToOne(() => Supplier, { nullable: true, eager: false })
  @JoinColumn({ name: 'nha_cung_cap_id' })
  nhaCungCap: Supplier | null;

  // FK to yeu_cau_doi_tra — plain column to avoid circular dependency with returns module
  @Column({ name: 'yeu_cau_doi_tra_id', nullable: true })
  yeuCauDoiTraId: number | null;

  @Column({ name: 'nhan_vien_nhap_id' })
  nhanVienNhapId: number;

  @ManyToOne(() => Employee, { nullable: false, eager: false })
  @JoinColumn({ name: 'nhan_vien_nhap_id' })
  nhanVienNhap: Employee;

  @Column({ name: 'ma_phieu_nhap', length: 255 })
  @Index('uq_pnk_maphieu', { unique: true })
  maPhieuNhap: string;

  @Column({ name: 'trang_thai', length: 50, default: 'ChoDuyet' })
  trangThai: TrangThaiPhieu;

  @CreateDateColumn({ name: 'ngay_nhap' })
  ngayNhap: Date;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string | null;

  @Column({ name: 'ngay_du_kien', type: 'date', nullable: true })
  ngayDuKien: string | null;

  @Column({ name: 'ngay_duyet', type: 'datetime', nullable: true })
  ngayDuyet: Date | null;

  @Column({ name: 'phieu_tien_nhiem_id', nullable: true })
  phieuTienNhiemId: number | null;

  @ManyToOne(() => ImportReceipt, { nullable: true, eager: false })
  @JoinColumn({ name: 'phieu_tien_nhiem_id' })
  phieuTienNhiem: ImportReceipt | null;

  @Column({ name: 'phieu_ke_tiep_id', nullable: true })
  phieuKeTiepId: number | null;

  @ManyToOne(() => ImportReceipt, { nullable: true, eager: false })
  @JoinColumn({ name: 'phieu_ke_tiep_id' })
  phieuKeTiep: ImportReceipt | null;

  @OneToMany(() => ImportReceiptItem, (item) => item.receipt, { cascade: true })
  items: ImportReceiptItem[];
}
