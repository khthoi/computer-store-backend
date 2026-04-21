import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Promotion } from './promotion.entity';

export enum ScopeType {
  GLOBAL = 'global',
  CATEGORY = 'category',
  PRODUCT = 'product',
  VARIANT = 'variant',
  BRAND = 'brand',
}

@Entity('promotion_scope')
export class PromotionScope {
  @PrimaryGeneratedColumn({ name: 'scope_id' })
  id: number;

  @Column({ name: 'promotion_id' })
  promotionId: number;

  @Column({ name: 'scope_type', type: 'varchar', length: 20 })
  scopeType: ScopeType;

  @Column({ name: 'scope_ref_id', length: 100, nullable: true })
  scopeRefId: string | null;

  @Column({ name: 'scope_ref_label', length: 300, nullable: true })
  scopeRefLabel: string | null;

  @ManyToOne(() => Promotion, (p) => p.scopes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promotion_id' })
  promotion: Promotion;
}
