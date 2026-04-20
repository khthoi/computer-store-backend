import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order, TrangThaiDon } from './order.entity';

@Entity('lich_su_trang_thai_don')
@Index('idx_lsttd_donhang', ['donHangId'])
export class OrderStatusHistory {
  @PrimaryGeneratedColumn({ name: 'lich_su_id' })
  id: number;

  @Column({ name: 'don_hang_id' })
  donHangId: number;

  // Dùng varchar thay enum để tránh bug TypeORM+MariaDB với ALTER TABLE enum
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

  @ManyToOne(() => Order, (o) => o.statusHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'don_hang_id' })
  order: Order;
}
