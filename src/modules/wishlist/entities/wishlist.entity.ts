import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToOne, JoinColumn,
} from 'typeorm';
import { WishlistItem } from './wishlist-item.entity';
import { Customer } from '../../users/entities/customer.entity';

@Entity('whislist') // typo preserved from ERD
export class Wishlist {
  @PrimaryGeneratedColumn({ name: 'wishlist_id' })
  id: number;

  @Column({ name: 'khach_hang_id' })
  customerId: number;

  @ManyToOne(() => Customer, { nullable: false, eager: false })
  @JoinColumn({ name: 'khach_hang_id' })
  customer: Customer;

  @CreateDateColumn({ name: 'ngay_tao' })
  createdAt: Date;

  @OneToMany(() => WishlistItem, (item) => item.wishlist, { cascade: true })
  items: WishlistItem[];
}
