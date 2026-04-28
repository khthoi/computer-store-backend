import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('ticket_khieu_nai')
@Index('idx_ticket_customer', ['customerId'])
@Index('idx_ticket_status', ['status'])
@Index('idx_ticket_ma', ['ticketCode'], { unique: true })
export class SupportTicket {
  @PrimaryGeneratedColumn({ name: 'ticket_id' })
  id: number;

  @Column({ name: 'ma_ticket', length: 50, unique: true })
  ticketCode: string;

  @Column({ name: 'khach_hang_id' })
  customerId: number;

  @Column({ name: 'don_hang_id', nullable: true })
  orderId: number | null;

  @Column({ name: 'loai_van_de', length: 30 })
  issueType: string;

  @Column({ name: 'muc_do_uu_tien', length: 20, default: 'TrungBinh' })
  priority: 'Cao' | 'TrungBinh' | 'Thap';

  @Column({ name: 'tieu_de', type: 'text' })
  title: string;

  @Column({ name: 'mo_ta', type: 'text' })
  description: string;

  @Column({ name: 'kenh_lien_he', length: 20 })
  channel: 'Chat' | 'Email' | 'DienThoai' | 'Form';

  @Column({ name: 'trang_thai', length: 20, default: 'Moi' })
  status: 'Moi' | 'DangXuLy' | 'ChoDongY' | 'DaDong' | 'MoLai';

  @Column({ name: 'nhan_vien_phu_trach_id', nullable: true })
  assignedToId: number | null;

  @Column({ name: 'first_response_at', type: 'timestamp', nullable: true })
  firstResponseAt: Date | null;

  @Column({ name: 'sla_deadline', type: 'timestamp', nullable: true })
  slaDeadline: Date | null;

  @Column({ name: 'tags', type: 'json', nullable: true })
  tags: string[] | null;

  @Column({ name: 'so_lan_mo_lai', type: 'tinyint', default: 0 })
  reopenCount: number;

  @CreateDateColumn({ name: 'ngay_tao' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  updatedAt: Date;

  @Column({ name: 'ngay_dong', type: 'timestamp', nullable: true })
  closedAt: Date | null;
}
