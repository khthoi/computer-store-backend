import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Promotion } from './promotion.entity';
import { BulkTier } from './bulk-tier.entity';
import { BulkComponent } from './bulk-component.entity';

export enum ActionType {
  PERCENTAGE_DISCOUNT = 'percentage_discount',
  FIXED_DISCOUNT_ITEM = 'fixed_discount_item',
  FIXED_DISCOUNT_CART = 'fixed_discount_cart',
  FREE_ITEM = 'free_item',
  BXGY = 'bxgy',
  BUNDLE_DISCOUNT = 'bundle_discount',
  BULK_DISCOUNT = 'bulk_discount',
  FREE_SHIPPING = 'free_shipping',
}

export enum ApplicationLevel {
  PER_ITEM = 'per_item',
  CART_TOTAL = 'cart_total',
  CHEAPEST_ITEM = 'cheapest_item',
}

@Entity('promotion_action')
export class PromotionAction {
  @PrimaryGeneratedColumn({ name: 'action_id' })
  id: number;

  @Column({ name: 'promotion_id' })
  promotionId: number;

  @Column({ name: 'action_type', type: 'varchar', length: 40 })
  actionType: ActionType;

  @Column({ name: 'application_level', type: 'varchar', length: 20 })
  applicationLevel: ApplicationLevel;

  @Column({ name: 'discount_type', type: 'varchar', length: 20, nullable: true })
  discountType: 'percentage' | 'fixed' | null;

  @Column({ name: 'discount_value', type: 'decimal', precision: 18, scale: 2, nullable: true })
  discountValue: number | null;

  @Column({ name: 'max_discount_amount', type: 'decimal', precision: 18, scale: 2, nullable: true })
  maxDiscountAmount: number | null;

  @Column({ name: 'bxgy_buy_qty', nullable: true })
  bxgyBuyQty: number | null;

  @Column({ name: 'bxgy_buy_product_id', length: 100, nullable: true })
  bxgyBuyProductId: string | null;

  @Column({ name: 'bxgy_get_qty', nullable: true })
  bxgyGetQty: number | null;

  @Column({ name: 'bxgy_get_product_id', length: 100, nullable: true })
  bxgyGetProductId: string | null;

  @Column({ name: 'bxgy_get_discount_pct', nullable: true })
  bxgyGetDiscountPct: number | null;

  @Column({ name: 'bxgy_delivery_mode', type: 'varchar', length: 30, nullable: true })
  bxgyDeliveryMode: 'auto_add' | 'customer_selects' | null;

  @Column({ name: 'bxgy_max_applications', nullable: true })
  bxgyMaxApplications: number | null;

  @Column({ name: 'bxgy_eligible_product_ids', type: 'text', nullable: true })
  bxgyEligibleProductIds: string | null;

  @ManyToOne(() => Promotion, (p) => p.actions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promotion_id' })
  promotion: Promotion;

  @OneToMany(() => BulkTier, (t) => t.action, { cascade: true })
  bulkTiers: BulkTier[];

  @OneToMany(() => BulkComponent, (c) => c.action, { cascade: true })
  bulkComponents: BulkComponent[];
}
