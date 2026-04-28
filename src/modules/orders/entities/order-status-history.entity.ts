import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { TrangThaiDon } from './order.entity';

// Retained for existing DB data only — no longer written to or registered in TypeORM.
// Use OrderActivityLog (nhat_ky_don_hang) for all new activity tracking.
@Entity('lich_su_trang_thai_don')
@Index('idx_lsttd_donhang', ['donHangId'])
export class OrderStatusHistory {
  @PrimaryGeneratedColumn({ name: 'lich_su_id' })
  id: number;

  @Column({ name: 'don_hang_id' })
  donHangId: number;

  @Column({ name: 'trang_thai_moi', type: 'varchar', length: 30 })
  trangThaiMoi: TrangThaiDon;

  @Column({ name: 'trang_thai_cu', type: 'varchar', length: 30, nullable: true })
  trangThaiCu: TrangThaiDon | null;

  @Column({ name: 'nguoi_cap_nhat_id', nullable: true })
  nguoiCapNhatId: number | null;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string | null;

  @CreateDateColumn({ name: 'thoi_diem' })
  thoiDiem: Date;
}
