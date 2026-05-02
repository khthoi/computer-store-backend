import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { SupportTicket } from './support-ticket.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('ticket_message')
@Index('idx_ticketmsg_ticket', ['ticketId'])
export class TicketMessage {
  @PrimaryGeneratedColumn({ name: 'message_id' })
  id: number;

  @Column({ name: 'ticket_id' })
  ticketId: number;

  @ManyToOne(() => SupportTicket, { nullable: false, eager: false })
  @JoinColumn({ name: 'ticket_id' })
  ticket: SupportTicket;

  @Column({ name: 'sender_type', length: 20 })
  senderType: 'KhachHang' | 'NhanVien' | 'HeThong';

  @Column({ name: 'sender_id', nullable: true })
  senderId: number | null;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'sender_id' })
  sender: Employee | null;

  @Column({ name: 'noi_dung_tin_nhan', type: 'text' })
  content: string;

  @Column({ name: 'loai_tin_nhan', length: 20, default: 'Reply' })
  messageType: 'Reply' | 'InternalNote' | 'SystemLog';

  @Column({ name: 'trang_thai_moi', length: 30, nullable: true })
  newStatus: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
