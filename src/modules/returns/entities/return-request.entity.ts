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

  @Column({ name: 'ly_do', length: 500 })
  reason: string;

  @Column({ name: 'mo_ta_chi_tiet', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'trang_thai', length: 20, default: 'ChoDuyet' })
  status: 'ChoDuyet' | 'DaDuyet' | 'TuChoi' | 'DangXuLy' | 'HoanThanh';

  @Column({ name: 'nhan_vien_xu_ly_id', nullable: true })
  processedById: number | null;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'nhan_vien_xu_ly_id' })
  processedBy: Employee | null;

  @Column({ name: 'ket_qua_kiem_tra', length: 30, nullable: true })
  inspectionResult: string | null;

  @Column({ name: 'huong_xu_ly', length: 20, nullable: true })
  resolution: 'GiaoHangMoi' | 'HoanTien' | 'BaoHanh' | null;

  @CreateDateColumn({ name: 'ngay_tao' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  updatedAt: Date;
}
