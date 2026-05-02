import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { ProductReview } from './product-review.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('danh_gia_message')
@Index('idx_dgmsg_review', ['reviewId'])
export class ReviewMessage {
  @PrimaryGeneratedColumn({ name: 'message_id' })
  id: number;

  @Column({ name: 'review_id' })
  reviewId: number;

  @ManyToOne(() => ProductReview, { nullable: false, eager: false })
  @JoinColumn({ name: 'review_id' })
  review: ProductReview;

  @Column({ name: 'sender_type', length: 20 })
  senderType: 'KhachHang' | 'NhanVien' | 'HeThong';

  @Column({ name: 'sender_id', nullable: true })
  senderId: number | null;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'sender_id' })
  sender: Employee | null;

  @Column({ name: 'noi_dung_tin_nhan', type: 'text' })
  content: string;

  @Column({ name: 'message_type', length: 20, default: 'Reply' })
  messageType: 'Reply' | 'InternalNote' | 'SystemLog';

  @Column({ name: 'is_visible_to_customer', type: 'tinyint' })
  isVisibleToCustomer: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date | null;
}
