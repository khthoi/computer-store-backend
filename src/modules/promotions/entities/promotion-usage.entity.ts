import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Promotion } from './promotion.entity';
import { Customer } from '../../users/entities/customer.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('promotion_usage')
export class PromotionUsage {
  @PrimaryGeneratedColumn({ name: 'usage_id' })
  id: number;

  @Column({ name: 'promotion_id' })
  promotionId: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @ManyToOne(() => Customer, { nullable: false, eager: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'order_id' })
  orderId: number;

  @ManyToOne(() => Order, { nullable: false, eager: false })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 18, scale: 2 })
  discountAmount: number;

  @CreateDateColumn({ name: 'applied_at' })
  appliedAt: Date;

  @ManyToOne(() => Promotion, (p) => p.usages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promotion_id' })
  promotion: Promotion;
}
