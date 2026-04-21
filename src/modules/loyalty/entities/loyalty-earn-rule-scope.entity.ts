import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { LoyaltyEarnRule } from './loyalty-earn-rule.entity';

@Entity('loyalty_earn_rule_scope')
export class LoyaltyEarnRuleScope {
  @PrimaryGeneratedColumn({ name: 'scope_id' })
  id: number;

  @Column({ name: 'earn_rule_id' })
  earnRuleId: number;

  @Column({ name: 'scope_type', type: 'varchar', length: 20 })
  scopeType: 'category' | 'brand' | 'product';

  @Column({ name: 'scope_ref_id', length: 255 })
  scopeRefId: string;

  @Column({ name: 'scope_ref_label', length: 255 })
  scopeRefLabel: string;

  @Column({ name: 'multiplier', type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  multiplier: number;

  @ManyToOne(() => LoyaltyEarnRule, (r) => r.scopes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'earn_rule_id' })
  earnRule: LoyaltyEarnRule;
}
