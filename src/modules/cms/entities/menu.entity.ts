import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, OneToMany } from 'typeorm';
import { MenuItem } from './menu-item.entity';

@Entity('menu')
export class Menu {
  @PrimaryGeneratedColumn({ name: 'menu_id' })
  id: number;

  @Column({ name: 'vi_tri', length: 100, unique: true })
  position: string;

  @Column({ name: 'ten', length: 255 })
  name: string;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  updatedAt: Date;

  @OneToMany(() => MenuItem, (item) => item.menu, { cascade: true })
  items: MenuItem[];
}
