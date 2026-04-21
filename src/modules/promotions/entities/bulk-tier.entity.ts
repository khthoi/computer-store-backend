import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PromotionAction } from './promotion-action.entity';

@Entity('promotion_action_bulk_tier')
export class BulkTier {
  @PrimaryGeneratedColumn({ name: 'tier_id' })
  id: number;

  @Column({ name: 'action_id' })
  actionId: number;

  @Column({ name: 'min_quantity' })
  minQuantity: number;

  @Column({ name: 'max_quantity', nullable: true })
  maxQuantity: number | null;

  @Column({ name: 'discount_value', type: 'decimal', precision: 18, scale: 2 })
  discountValue: number;

  @Column({ name: 'discount_type', type: 'varchar', length: 20 })
  discountType: 'percentage' | 'fixed';

  @ManyToOne(() => PromotionAction, (a) => a.bulkTiers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'action_id' })
  action: PromotionAction;
}
