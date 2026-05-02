import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('popup_thong_bao')
export class Popup {
  @PrimaryGeneratedColumn({ name: 'popup_id' })
  id: number;

  @Column({ name: 'tieu_de', length: 255 })
  title: string;

  @Column({ name: 'noi_dung', type: 'text' })
  content: string;

  @Column({
    name: 'loai',
    type: 'enum',
    enum: ['banner_top', 'popup_center', 'banner_bot'],
    default: 'popup_center',
  })
  type: string;

  @Column({ name: 'mau_nen', length: 20, nullable: true })
  bgColor: string | null;

  @Column({ name: 'mau_chu', length: 20, nullable: true })
  textColor: string | null;

  @Column({ name: 'icon', length: 100, nullable: true })
  icon: string | null;

  @Column({ name: 'url_hanh_dong', length: 500, nullable: true })
  actionUrl: string | null;

  @Column({ name: 'nhan_hanh_dong', length: 100, nullable: true })
  actionLabel: string | null;

  @Column({
    name: 'trang_thai',
    type: 'enum',
    enum: ['nhap', 'hoat_dong', 'an'],
    default: 'nhap',
  })
  status: string;

  @Column({ name: 'thu_tu', default: 0 })
  sortOrder: number;

  @Column({ name: 'ngay_bat_dau', type: 'datetime', nullable: true })
  startAt: Date | null;

  @Column({ name: 'ngay_ket_thuc', type: 'datetime', nullable: true })
  endAt: Date | null;

  @Column({ name: 'cho_phep_dong', default: true })
  allowClose: boolean;

  @Column({ name: 'nguoi_tao_id', nullable: true })
  createdById: number | null;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'nguoi_tao_id' })
  createdBy: Employee | null;

  @CreateDateColumn({ name: 'ngay_tao' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  updatedAt: Date;
}
