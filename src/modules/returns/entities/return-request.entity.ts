import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('yeu_cau_doi_tra')
@Index('idx_return_order', ['orderId'])
@Index('idx_return_customer', ['customerId'])
@Index('idx_return_status', ['status'])
export class ReturnRequest {
  @PrimaryGeneratedColumn({ name: 'yeu_cau_id' })
  id: number;

  @Column({ name: 'don_hang_id' })
  orderId: number;

  @Column({ name: 'khach_hang_id' })
  customerId: number;

  @Column({ name: 'loai_yeu_cau', length: 20 })
  requestType: 'DoiHang' | 'TraHang' | 'BaoHanh';

  @Column({ name: 'ly_do', length: 30 })
  reason: string;

  @Column({ name: 'mo_ta_chi_tiet', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'hinh_anh_bang_chung', type: 'text', nullable: true })
  evidenceImages: string | null;

  @Column({ name: 'trang_thai', length: 20, default: 'ChoDuyet' })
  status: 'ChoDuyet' | 'DaDuyet' | 'TuChoi' | 'DangXuLy' | 'HoanThanh';

  @Column({ name: 'nhan_vien_xu_ly_id', nullable: true })
  processedById: number | null;

  @Column({ name: 'ket_qua_kiem_tra', length: 30, nullable: true })
  inspectionResult: string | null;

  @Column({ name: 'huong_xu_ly', length: 20, nullable: true })
  resolution: 'GiaoHangMoi' | 'HoanTien' | 'BaoHanh' | null;

  @CreateDateColumn({ name: 'ngay_tao' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  updatedAt: Date;
}
