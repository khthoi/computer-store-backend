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

export enum PopupStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SCHEDULED = 'scheduled',
  ENDED = 'ended',
}

export enum PopupPosition {
  CENTER = 'center',
  TOP_LEFT = 'top_left',
  TOP_RIGHT = 'top_right',
  BOTTOM_LEFT = 'bottom_left',
  BOTTOM_RIGHT = 'bottom_right',
}

export enum PopupTrigger {
  ON_LOAD = 'on_load',
  ON_EXIT = 'on_exit',
  ON_SCROLL = 'on_scroll',
  ON_DELAY = 'on_delay',
}

@Entity('popup_thong_bao')
export class Popup {
  @PrimaryGeneratedColumn({ name: 'popup_id' })
  id: number;

  @Column({ name: 'ten_popup', length: 255, default: 'Popup' })
  name: string;

  @Column({ name: 'tieu_de', length: 255, nullable: true })
  title: string | null;

  @Column({ name: 'noi_dung', type: 'text' })
  body: string;

  @Column({
    name: 'trang_thai',
    type: 'enum',
    enum: PopupStatus,
    default: PopupStatus.DRAFT,
  })
  status: PopupStatus;

  @Column({
    name: 'vi_tri',
    type: 'enum',
    enum: PopupPosition,
    default: PopupPosition.CENTER,
  })
  position: PopupPosition;

  @Column({
    name: 'kich_hoat',
    type: 'enum',
    enum: PopupTrigger,
    default: PopupTrigger.ON_LOAD,
  })
  trigger: PopupTrigger;

  @Column({ name: 'gio_tre', type: 'int', nullable: true })
  delaySeconds: number | null;

  @Column({ name: 'phan_tram_cuon', type: 'int', nullable: true })
  scrollPercent: number | null;

  @Column({ name: 'url_anh', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ name: 'nhan_hanh_dong', length: 100, nullable: true })
  ctaLabel: string | null;

  @Column({ name: 'url_hanh_dong', length: 500, nullable: true })
  ctaUrl: string | null;

  @Column({ name: 'cho_phep_dong', default: true })
  showCloseButton: boolean;

  @Column({ name: 'hien_thi_mot_lan', default: false })
  showOnce: boolean;

  @Column({ name: 'trang_muc_tieu', type: 'simple-json', nullable: true })
  targetPages: string[] | null;

  @Column({ name: 'ngay_bat_dau', type: 'datetime', nullable: true })
  startDate: Date | null;

  @Column({ name: 'ngay_ket_thuc', type: 'datetime', nullable: true })
  endDate: Date | null;

  @Column({ name: 'luot_xem', default: 0 })
  viewCount: number;

  @Column({ name: 'luot_click', default: 0 })
  clickCount: number;

  @Column({ name: 'luot_dong', default: 0 })
  closeCount: number;

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
