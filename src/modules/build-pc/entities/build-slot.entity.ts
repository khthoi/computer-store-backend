import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';

@Entity('buildpc_slot_dinh_nghia')
export class BuildSlot {
  @PrimaryGeneratedColumn({ name: 'slot_id' })
  id: number;

  @Column({ name: 'ten_slot', length: 50 })
  tenSlot: string;

  @Column({ name: 'ma_khe', length: 50, unique: true })
  maKhe: string;

  @Column({ name: 'danh_muc_id' })
  danhMucId: number;

  @ManyToOne(() => Category, { nullable: false, eager: false })
  @JoinColumn({ name: 'danh_muc_id' })
  danhMuc: Category;

  @Column({ name: 'bat_buoc', type: 'tinyint', default: 1 })
  batBuoc: boolean;

  @Column({ name: 'so_luong_min', type: 'tinyint', default: 1 })
  soLuongMin: number;

  @Column({ name: 'so_luong_max', type: 'tinyint', default: 1 })
  soLuongMax: number;

  @Column({ name: 'thu_tu', type: 'smallint', default: 0 })
  thuTu: number;

  @Column({ name: 'icon_key', length: 50, nullable: true })
  iconKey: string | null;

  @Column({ name: 'mo_ta', type: 'text', nullable: true })
  moTa: string | null;

  @Column({ name: 'is_active', type: 'tinyint', default: 1 })
  isActive: boolean;

  @CreateDateColumn({ name: 'ngay_tao' })
  ngayTao: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  ngayCapNhat: Date;
}
