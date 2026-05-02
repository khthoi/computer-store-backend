import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { ExportReceiptItem } from './export-receipt-item.entity';

export type LoaiPhieuXuat = 'XuatHuy' | 'XuatDieuChinh' | 'XuatNoiBo' | 'XuatBan';

@Entity('phieu_xuat_kho')
@Index('idx_pxk_loai', ['loaiPhieu'])
@Index('idx_pxk_ngay', ['ngayXuat'])
export class ExportReceipt {
  @PrimaryGeneratedColumn({ name: 'xuat_id' })
  id: number;

  @Column({ name: 'ma_phieu_xuat', length: 50, unique: true })
  maPhieuXuat: string;

  @Column({ name: 'loai_phieu', length: 20 })
  loaiPhieu: LoaiPhieuXuat;

  @Column({ name: 'nhan_vien_xuat_id' })
  nhanVienXuatId: number;

  @ManyToOne(() => Employee, { nullable: false, eager: false })
  @JoinColumn({ name: 'nhan_vien_xuat_id' })
  nhanVienXuat: Employee;

  @Column({ name: 'ly_do', type: 'text' })
  lyDo: string;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string | null;

  @Column({ name: 'tong_gia_von', type: 'decimal', precision: 18, scale: 2, default: 0 })
  tongGiaVon: number;

  @CreateDateColumn({ name: 'ngay_xuat' })
  ngayXuat: Date;

  @OneToMany(() => ExportReceiptItem, (item) => item.receipt, { cascade: true })
  items: ExportReceiptItem[];
}
