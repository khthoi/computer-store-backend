import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Menu } from './menu.entity';

@Entity('menu_item')
export class MenuItem {
  @PrimaryGeneratedColumn({ name: 'item_id' })
  id: number;

  @Column({ name: 'menu_id' })
  menuId: number;

  @Column({ name: 'parent_id', nullable: true })
  parentId: number | null;

  @ManyToOne(() => MenuItem, { nullable: true, eager: false })
  @JoinColumn({ name: 'parent_id' })
  parent: MenuItem | null;

  @Column({ name: 'nhan', length: 255 })
  label: string;

  @Column({ name: 'url', length: 500 })
  url: string;

  @Column({
    name: 'loai',
    type: 'enum',
    enum: ['link', 'page', 'category'],
    default: 'link',
  })
  type: string;

  @Column({ name: 'thu_tu', default: 0 })
  sortOrder: number;

  @Column({ name: 'la_hien_thi', default: true })
  isVisible: boolean;

  @Column({ name: 'mo_link_moi', default: false })
  openInNewTab: boolean;

  @ManyToOne(() => Menu, (m) => m.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_id' })
  menu: Menu;
}
