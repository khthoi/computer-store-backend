import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity('product_view_history')
export class ProductViewHistory {
  @PrimaryGeneratedColumn({ name: 'view_history_id' })
  id: number;

  @Column({ name: 'khach_hang_id' })
  customerId: number;

  @Column({ name: 'phien_ban_id' })
  variantId: number;

  @CreateDateColumn({ name: 'thoi_diem_xem' })
  viewedAt: Date;
}
