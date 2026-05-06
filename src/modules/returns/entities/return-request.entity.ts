import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { Customer } from '../../users/entities/customer.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('yeu_cau_doi_tra')
@Index('idx_return_order', ['orderId'])
@Index('idx_return_customer', ['customerId'])
@Index('idx_return_status', ['status'])
export class ReturnRequest {
  @PrimaryGeneratedColumn({ name: 'yeu_cau_id' })
  id: number;

  @Column({ name: 'don_hang_id' })
  orderId: number;

  @ManyToOne(() => Order, { nullable: false, eager: false })
  @JoinColumn({ name: 'don_hang_id' })
  order: Order;

  @Column({ name: 'khach_hang_id' })
  customerId: number;

  @ManyToOne(() => Customer, { nullable: false, eager: false })
  @JoinColumn({ name: 'khach_hang_id' })
  customer: Customer;

  @Column({ name: 'loai_yeu_cau', length: 20 })
  requestType: 'DoiHang' | 'TraHang' | 'BaoHanh';

  @Column({ name: 'ly_do', length: 50 })
  reason: string;

  @Column({ name: 'mo_ta_chi_tiet', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'trang_thai', length: 20, default: 'ChoDuyet' })
  status: 'ChoDuyet' | 'DaDuyet' | 'TuChoi' | 'DaNhanHang' | 'DaKiemTra' | 'TuChoiNhanHang' | 'DangXuLy' | 'HoanThanh';

  @Column({ name: 'nhan_vien_xu_ly_id', nullable: true })
  processedById: number | null;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'nhan_vien_xu_ly_id' })
  processedBy: Employee | null;

  @Column({ name: 'ket_qua_kiem_tra', type: 'text', nullable: true })
  inspectionResult: string | null;

  @Column({ name: 'huong_xu_ly', length: 20, nullable: true })
  resolution: 'GiaoHangMoi' | 'HoanTien' | 'BaoHanh' | null;

  // ── Tracking hàng khách gửi về ───────────────────────────────────────────
  @Column({ name: 'ma_van_don_hoan_tra', length: 200, nullable: true })
  returnTrackingCode: string | null;

  @Column({ name: 'don_vi_vc_hoan_tra', length: 100, nullable: true })
  returnCarrier: string | null;

  @Column({ name: 'ngay_nhan_hang_hoan_tra', type: 'datetime', nullable: true })
  returnReceivedAt: Date | null;

  @Column({ name: 'nv_xac_nhan_nhan_hang_id', nullable: true })
  returnReceivedById: number | null;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'nv_xac_nhan_nhan_hang_id' })
  returnReceivedBy: Employee | null;

  // ── Thông tin từ chối nhận hàng (sau kiểm tra) ──────────────────────────
  @Column({ name: 'reject_tracking_code', length: 200, nullable: true })
  rejectTrackingCode: string | null;

  @Column({ name: 'reject_carrier', length: 100, nullable: true })
  rejectCarrier: string | null;

  @Column({ name: 'reject_notes', type: 'text', nullable: true })
  rejectNotes: string | null;

  @Column({ name: 'rejected_at', type: 'datetime', nullable: true })
  rejectedAt: Date | null;

  @Column({ name: 'rejected_by_id', nullable: true })
  rejectedById: number | null;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'rejected_by_id' })
  rejectedBy: Employee | null;

  @Column({ name: 'ngay_duyet', type: 'datetime', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'ngay_kiem_tra', type: 'datetime', nullable: true })
  inspectedAt: Date | null;

  @Column({ name: 'ngay_bat_dau_xu_ly', type: 'datetime', nullable: true })
  processingStartedAt: Date | null;

  @CreateDateColumn({ name: 'ngay_tao' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  updatedAt: Date;
}
