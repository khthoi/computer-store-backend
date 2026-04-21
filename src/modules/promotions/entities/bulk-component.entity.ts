import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PromotionAction } from './promotion-action.entity';

@Entity('promotion_action_bulk_component')
export class BulkComponent {
  @PrimaryGeneratedColumn({ name: 'component_id' })
  id: number;

  @Column({ name: 'action_id' })
  actionId: number;

  @Column({ name: 'scope', type: 'varchar', length: 20 })
  scope: 'category' | 'product' | 'variant';

  @Column({ name: 'ref_id', length: 100 })
  refId: string;

  @Column({ name: 'ref_label', length: 300, nullable: true })
  refLabel: string | null;

  @Column({ name: 'min_quantity' })
  minQuantity: number;

  @ManyToOne(() => PromotionAction, (a) => a.bulkComponents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'action_id' })
  action: PromotionAction;
}
