import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Customer } from '../../users/entities/customer.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';

@Entity('product_view_history')
export class ProductViewHistory {
  @PrimaryGeneratedColumn({ name: 'view_history_id' })
  id: number;

  @Column({ name: 'khach_hang_id' })
  customerId: number;

  @ManyToOne(() => Customer, { nullable: false, eager: false })
  @JoinColumn({ name: 'khach_hang_id' })
  customer: Customer;

  @Column({ name: 'phien_ban_id' })
  variantId: number;

  @ManyToOne(() => ProductVariant, { nullable: false, eager: false })
  @JoinColumn({ name: 'phien_ban_id' })
  variant: ProductVariant;

  @CreateDateColumn({ name: 'thoi_diem_xem' })
  viewedAt: Date;
}
