import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Promotion } from './promotion.entity';

@Entity('promotion_usage')
export class PromotionUsage {
  @PrimaryGeneratedColumn({ name: 'usage_id' })
  id: number;

  @Column({ name: 'promotion_id' })
  promotionId: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ name: 'order_id' })
  orderId: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 18, scale: 2 })
  discountAmount: number;

  @CreateDateColumn({ name: 'applied_at' })
  appliedAt: Date;

  @ManyToOne(() => Promotion, (p) => p.usages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promotion_id' })
  promotion: Promotion;
}
