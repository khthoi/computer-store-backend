import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { LoyaltyEarnRuleScope } from './loyalty-earn-rule-scope.entity';

@Entity('loyalty_earn_rules')
export class LoyaltyEarnRule {
  @PrimaryGeneratedColumn({ name: 'earn_rule_id' })
  id: number;

  @Column({ name: 'name', length: 255 })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'points_per_unit', default: 1 })
  pointsPerUnit: number;

  @Column({ name: 'spend_per_unit', type: 'decimal', precision: 18, scale: 2 })
  spendPerUnit: number;

  @Column({ name: 'min_order_value', type: 'decimal', precision: 18, scale: 2, nullable: true })
  minOrderValue: number | null;

  @Column({ name: 'max_points_per_order', nullable: true })
  maxPointsPerOrder: number | null;

  @Column({ name: 'bonus_trigger', type: 'varchar', length: 30, nullable: true })
  bonusTrigger: 'first_order' | 'birthday' | 'manual' | null;

  @Column({ name: 'bonus_points', nullable: true })
  bonusPoints: number | null;

  @Column({ name: 'is_active', type: 'tinyint', default: 1 })
  isActive: boolean;

  @Column({ name: 'priority', default: 0 })
  priority: number;

  @Column({ name: 'valid_from', type: 'datetime', nullable: true })
  validFrom: Date | null;

  @Column({ name: 'valid_until', type: 'datetime', nullable: true })
  validUntil: Date | null;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => LoyaltyEarnRuleScope, (s) => s.earnRule, { cascade: true })
  scopes: LoyaltyEarnRuleScope[];
}
