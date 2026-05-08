import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Customer } from '../../users/entities/customer.entity';
import { Order } from '../../orders/entities/order.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { IssueType, TicketChannel, TicketPriority, TicketStatus } from '../support.enums';

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

  @ManyToOne(() => Customer, { nullable: false, eager: false })
  @JoinColumn({ name: 'khach_hang_id' })
  customer: Customer;

  @Column({ name: 'don_hang_id', nullable: true })
  orderId: number | null;

  @ManyToOne(() => Order, { nullable: true, eager: false })
  @JoinColumn({ name: 'don_hang_id' })
  order: Order | null;

  @Column({ name: 'loai_van_de', type: 'enum', enum: IssueType })
  issueType: IssueType;

  @Column({ name: 'muc_do_uu_tien', type: 'enum', enum: TicketPriority, default: TicketPriority.TrungBinh })
  priority: TicketPriority;

  @Column({ name: 'tieu_de', type: 'text' })
  title: string;

  @Column({ name: 'mo_ta', type: 'text' })
  description: string;

  @Column({ name: 'kenh_lien_he', type: 'enum', enum: TicketChannel })
  channel: TicketChannel;

  @Column({ name: 'trang_thai', type: 'enum', enum: TicketStatus, default: TicketStatus.Moi })
  status: TicketStatus;

  @Column({ name: 'nhan_vien_phu_trach_id', nullable: true })
  assignedToId: number | null;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'nhan_vien_phu_trach_id' })
  assignedTo: Employee | null;

  @Column({ name: 'first_response_at', type: 'timestamp', nullable: true })
  firstResponseAt: Date | null;

  @Column({ name: 'sla_deadline', type: 'timestamp', nullable: true })
  slaDeadline: Date | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'so_lan_mo_lai', type: 'tinyint', default: 0 })
  reopenCount: number;

  @CreateDateColumn({ name: 'ngay_tao' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  updatedAt: Date;

  @Column({ name: 'ngay_dong', type: 'timestamp', nullable: true })
  closedAt: Date | null;
}
