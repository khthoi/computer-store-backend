import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('ticket_message')
@Index('idx_ticketmsg_ticket', ['ticketId'])
export class TicketMessage {
  @PrimaryGeneratedColumn({ name: 'message_id' })
  id: number;

  @Column({ name: 'ticket_id' })
  ticketId: number;

  @Column({ name: 'sender_type', length: 20 })
  senderType: 'KhachHang' | 'NhanVien' | 'HeThong';

  @Column({ name: 'sender_id', nullable: true })
  senderId: number | null;

  @Column({ name: 'noi_dung_tin_nhan', type: 'text' })
  content: string;

  @Column({ name: 'loai_tin_nhan', length: 20, default: 'Reply' })
  messageType: 'Reply' | 'InternalNote' | 'SystemLog';

  @Column({ name: 'trang_thai_moi', length: 30, nullable: true })
  newStatus: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
