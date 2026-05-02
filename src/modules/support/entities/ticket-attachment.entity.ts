import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { TicketMessage } from './ticket-message.entity';
import { MediaAsset } from '../../media/entities/media-asset.entity';

@Entity('ticket_attachment')
@Index('idx_ticketatt_message', ['messageId'])
export class TicketAttachment {
  @PrimaryGeneratedColumn({ name: 'attachment_id' })
  id: number;

  @Column({ name: 'message_id' })
  messageId: number;

  @ManyToOne(() => TicketMessage, { nullable: false, eager: false })
  @JoinColumn({ name: 'message_id' })
  message: TicketMessage;

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

  @ManyToOne(() => MediaAsset, { nullable: true, eager: false })
  @JoinColumn({ name: 'asset_id' })
  asset: MediaAsset | null;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;
}
