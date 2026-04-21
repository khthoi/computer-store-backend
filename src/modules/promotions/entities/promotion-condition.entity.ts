import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Promotion } from './promotion.entity';

export enum ConditionType {
  MIN_ORDER_VALUE = 'min_order_value',
  MIN_ITEM_QUANTITY = 'min_item_quantity',
  CUSTOMER_GROUP = 'customer_group',
  REQUIRED_PRODUCTS = 'required_products',
  REQUIRED_CATEGORIES = 'required_categories',
  PAYMENT_METHOD = 'payment_method',
  PLATFORM = 'platform',
  FIRST_ORDER_ONLY = 'first_order_only',
}

export enum ConditionOperator {
  GTE = 'gte',
  LTE = 'lte',
  EQ = 'eq',
  IN = 'in',
  ALL_IN_CART = 'all_in_cart',
  ANY_IN_CART = 'any_in_cart',
}

@Entity('promotion_condition')
export class PromotionCondition {
  @PrimaryGeneratedColumn({ name: 'condition_id' })
  id: number;

  @Column({ name: 'promotion_id' })
  promotionId: number;

  @Column({ name: 'type', type: 'varchar', length: 40 })
  type: ConditionType;

  @Column({ name: 'operator', type: 'varchar', length: 20 })
  operator: ConditionOperator;

  @Column({ name: 'value', type: 'text' })
  value: string;

  @ManyToOne(() => Promotion, (p) => p.conditions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promotion_id' })
  promotion: Promotion;
}
