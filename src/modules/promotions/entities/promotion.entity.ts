import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { PromotionScope } from './promotion-scope.entity';
import { PromotionCondition } from './promotion-condition.entity';
import { PromotionAction } from './promotion-action.entity';
import { PromotionUsage } from './promotion-usage.entity';

export enum PromotionType {
  STANDARD = 'standard',
  BXGY = 'bxgy',
  BUNDLE = 'bundle',
  BULK = 'bulk',
  FREE_SHIPPING = 'free_shipping',
}

export enum PromotionStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SCHEDULED = 'scheduled',
  PAUSED = 'paused',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

export enum StackingPolicy {
  EXCLUSIVE = 'exclusive',
  STACKABLE = 'stackable',
  STACKABLE_WITH_COUPONS_ONLY = 'stackable_with_coupons_only',
}

@Entity('promotions')
@Index('idx_promo_status', ['status'])
@Index('idx_promo_code', ['code'])
@Index('idx_promo_dates', ['startDate', 'endDate'])
export class Promotion {
  @PrimaryGeneratedColumn({ name: 'promotion_id' })
  id: number;

  @Column({ name: 'name', length: 300 })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'type', type: 'varchar', length: 30 })
  type: PromotionType;

  @Column({ name: 'is_coupon', type: 'boolean', default: false })
  isCoupon: boolean;

  @Column({ name: 'code', length: 50, nullable: true, unique: true })
  code: string | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'draft' })
  status: PromotionStatus;

  @Column({ name: 'priority', default: 0 })
  priority: number;

  @Column({ name: 'stacking_policy', type: 'varchar', length: 40, default: 'exclusive' })
  stackingPolicy: StackingPolicy;

  @Column({ name: 'start_date', type: 'datetime' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'datetime' })
  endDate: Date;

  @Column({ name: 'total_usage_limit', nullable: true })
  totalUsageLimit: number | null;

  @Column({ name: 'per_customer_limit', nullable: true })
  perCustomerLimit: number | null;

  @Column({ name: 'usage_count', default: 0 })
  usageCount: number;

  @Column({ name: 'created_by' })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => PromotionScope, (s) => s.promotion, { cascade: true })
  scopes: PromotionScope[];

  @OneToMany(() => PromotionCondition, (c) => c.promotion, { cascade: true })
  conditions: PromotionCondition[];

  @OneToMany(() => PromotionAction, (a) => a.promotion, { cascade: true })
  actions: PromotionAction[];

  @OneToMany(() => PromotionUsage, (u) => u.promotion)
  usages: PromotionUsage[];
}
