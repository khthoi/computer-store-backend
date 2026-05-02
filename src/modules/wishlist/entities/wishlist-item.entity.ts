import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Wishlist } from './wishlist.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';

@Entity('whislist_item') // typo preserved from ERD
export class WishlistItem {
  @PrimaryGeneratedColumn({ name: 'wishlist_item_id' })
  id: number;

  @Column({ name: 'wishlist_id' })
  wishlistId: number;

  @Column({ name: 'phien_ban_id' })
  variantId: number;

  @ManyToOne(() => ProductVariant, { nullable: false, eager: false })
  @JoinColumn({ name: 'phien_ban_id' })
  variant: ProductVariant;

  @CreateDateColumn({ name: 'ngay_them' })
  addedAt: Date;

  @ManyToOne(() => Wishlist, (w) => w.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wishlist_id' })
  wishlist: Wishlist;
}
