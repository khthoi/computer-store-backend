import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany,
} from 'typeorm';
import { WishlistItem } from './wishlist-item.entity';

@Entity('whislist') // typo preserved from ERD
export class Wishlist {
  @PrimaryGeneratedColumn({ name: 'wishlist_id' })
  id: number;

  @Column({ name: 'khach_hang_id' })
  customerId: number;

  @CreateDateColumn({ name: 'ngay_tao' })
  createdAt: Date;

  @OneToMany(() => WishlistItem, (item) => item.wishlist, { cascade: true })
  items: WishlistItem[];
}
