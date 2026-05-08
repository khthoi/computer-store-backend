import { ApiProperty } from '@nestjs/swagger';
import { TicketMessage } from '../entities/ticket-message.entity';
import { TicketAttachment } from '../entities/ticket-attachment.entity';
import { TicketAttachmentResponseDto } from './ticket-attachment-response.dto';

export class TicketMessageResponseDto {
  @ApiProperty() messageId: number;
  @ApiProperty() ticketId: number;
  @ApiProperty() senderType: string;
  @ApiProperty({ nullable: true }) senderId: number | null;
  @ApiProperty() senderName: string;
  @ApiProperty({ nullable: true }) senderAvatar?: string;
  @ApiProperty() noiDungTinNhan: string;
  @ApiProperty() loaiTinNhan: string;
  @ApiProperty({ nullable: true }) trangThaiMoi?: string;
  @ApiProperty({ type: [TicketAttachmentResponseDto] }) attachments: TicketAttachmentResponseDto[];
  @ApiProperty() createdAt: string;

  static from(
    msg: TicketMessage,
    senderName: string,
    senderAvatar: string | null | undefined,
    attachments: TicketAttachment[],
  ): TicketMessageResponseDto {
    const dto = new TicketMessageResponseDto();
    dto.messageId      = msg.id;
    dto.ticketId       = msg.ticketId;
    dto.senderType     = msg.senderType;
    dto.senderId       = msg.senderId;
    dto.senderName     = senderName;
    dto.senderAvatar   = senderAvatar ?? undefined;
    dto.noiDungTinNhan = msg.content;
    dto.loaiTinNhan    = msg.messageType;
    dto.trangThaiMoi   = msg.newStatus ?? undefined;
    dto.attachments    = attachments.map(a => ({
      attachmentId: a.id,
      messageId:    a.messageId,
      fileName:     a.fileName,
      fileUrl:      a.fileUrl,
      fileType:     a.fileType,
      fileSize:     a.fileSize,
      uploadedAt:   a.uploadedAt instanceof Date ? a.uploadedAt.toISOString() : String(a.uploadedAt),
    }));
    dto.createdAt = msg.createdAt instanceof Date ? msg.createdAt.toISOString() : String(msg.createdAt);
    return dto;
  }
}
