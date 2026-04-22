import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('ticket_attachment')
@Index('idx_ticketatt_message', ['messageId'])
export class TicketAttachment {
  @PrimaryGeneratedColumn({ name: 'attachment_id' })
  id: number;

  @Column({ name: 'message_id' })
  messageId: number;

  @Column({ name: 'file_name', length: 255 })
  fileName: string;

  @Column({ name: 'file_url', length: 2048 })
  fileUrl: string;

  @Column({ name: 'file_type', length: 100 })
  fileType: string;

  @Column({ name: 'file_size' })
  fileSize: number;

  @Column({ name: 'asset_id', nullable: true })
  assetId: number | null;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;
}
