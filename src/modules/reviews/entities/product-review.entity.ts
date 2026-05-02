import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { ProductVariant } from '../../products/entities/product-variant.entity';
import { Customer } from '../../users/entities/customer.entity';
import { Order } from '../../orders/entities/order.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('danh_gia_san_pham')
@Index('idx_review_variant', ['variantId'])
@Index('idx_review_customer', ['customerId'])
@Index('idx_review_order', ['orderId'])
@Index('idx_review_status', ['status'])
export class ProductReview {
  @PrimaryGeneratedColumn({ name: 'review_id' })
  id: number;

  @Column({ name: 'phien_ban_id' })
  variantId: number;

  @ManyToOne(() => ProductVariant, { nullable: false, eager: false })
  @JoinColumn({ name: 'phien_ban_id' })
  variant: ProductVariant;

  @Column({ name: 'khach_hang_id' })
  customerId: number;

  @ManyToOne(() => Customer, { nullable: false, eager: false })
  @JoinColumn({ name: 'khach_hang_id' })
  customer: Customer;

  @Column({ name: 'don_hang_id' })
  orderId: number;

  @ManyToOne(() => Order, { nullable: false, eager: false })
  @JoinColumn({ name: 'don_hang_id' })
  order: Order;

  @Column({ name: 'rating', type: 'smallint' })
  rating: number;

  @Column({ name: 'tieu_de', length: 255, nullable: true })
  title: string | null;

  @Column({ name: 'noi_dung', type: 'text', nullable: true })
  content: string | null;

  @Column({ name: 'review_status', length: 20, default: 'Pending' })
  status: 'Pending' | 'Approved' | 'Rejected' | 'Hidden';

  @Column({ name: 'nguoi_duyet_id', nullable: true })
  approvedById: number | null;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'nguoi_duyet_id' })
  approvedBy: Employee | null;

  @Column({ name: 'ly_do_tu_choi', length: 500, nullable: true })
  rejectReason: string | null;

  @Column({ name: 'da_phan_hoi', type: 'tinyint', default: 0 })
  hasReply: number;

  @Column({ name: 'helpful_count', default: 0 })
  helpfulCount: number;

  @Column({ name: 'duyet_tai', length: 30, nullable: true })
  approvedAt: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
