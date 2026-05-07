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

export enum BarStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SCHEDULED = 'scheduled',
  ENDED = 'ended',
}

export enum BarPosition {
  TOP = 'top',
  BOTTOM = 'bottom',
}

@Entity('thanh_thong_bao')
export class AnnouncementBar {
  @PrimaryGeneratedColumn({ name: 'thanh_id' })
  id: number;

  @Column({ name: 'ten_thanh', length: 255 })
  name: string;

  @Column({
    name: 'trang_thai',
    type: 'enum',
    enum: BarStatus,
    default: BarStatus.DRAFT,
  })
  status: BarStatus;

  @Column({
    name: 'vi_tri',
    type: 'enum',
    enum: BarPosition,
    default: BarPosition.TOP,
  })
  position: BarPosition;

  @Column({ name: 'noi_dung', type: 'text' })
  content: string;

  @Column({ name: 'mau_nen', length: 20, default: '#000000' })
  backgroundColor: string;

  @Column({ name: 'mau_chu', length: 20, default: '#ffffff' })
  textColor: string;

  @Column({ name: 'cho_phep_dong', default: true })
  showCloseButton: boolean;

  @Column({ name: 'cuon_chu', default: false })
  isScrolling: boolean;

  @Column({ name: 'url_lien_ket', length: 500, nullable: true })
  linkUrl: string | null;

  @Column({ name: 'nhan_lien_ket', length: 100, nullable: true })
  linkLabel: string | null;

  @Column({ name: 'ngay_bat_dau', type: 'datetime', nullable: true })
  startDate: Date | null;

  @Column({ name: 'ngay_ket_thuc', type: 'datetime', nullable: true })
  endDate: Date | null;

  @Column({ name: 'luot_xem', default: 0 })
  viewCount: number;

  @Column({ name: 'luot_click', default: 0 })
  clickCount: number;

  @Column({ name: 'nguoi_tao_id', nullable: true })
  createdById: number | null;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'nguoi_tao_id' })
  createdByEmployee: Employee | null;

  @CreateDateColumn({ name: 'ngay_tao' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  updatedAt: Date;
}
