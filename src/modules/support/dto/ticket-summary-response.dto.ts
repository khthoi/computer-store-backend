import { ApiProperty } from '@nestjs/swagger';
import { SupportTicket } from '../entities/support-ticket.entity';
import { TicketStatus } from '../support.enums';

export class TicketSummaryResponseDto {
  @ApiProperty() ticketId: number;
  @ApiProperty() maTicket: string;
  @ApiProperty() khachHangId: number;
  @ApiProperty() khachHangTen: string;
  @ApiProperty() khachHangEmail: string;
  @ApiProperty() loaiVanDe: string;
  @ApiProperty() mucDoUuTien: string;
  @ApiProperty() tieuDe: string;
  @ApiProperty() kenhLienHe: string;
  @ApiProperty() trangThai: string;
  @ApiProperty({ nullable: true }) nhanVienPhuTrachId?: number;
  @ApiProperty({ nullable: true }) nhanVienPhuTrachMa?: string;
  @ApiProperty({ nullable: true }) nhanVienPhuTrachTen?: string;
  @ApiProperty({ nullable: true }) nhanVienPhuTrachAvatar?: string;
  @ApiProperty() messageCount: number;
  @ApiProperty({ nullable: true }) lastMessageAt?: string;
  @ApiProperty() ngayTao: string;
  @ApiProperty({ nullable: true }) slaDeadline?: string;
  @ApiProperty() isSlaBreached: boolean;
  @ApiProperty({ nullable: true }) lastSenderType?: string;

  static from(
    ticket: SupportTicket,
    messageCount: number,
    lastMessageAt: Date | null,
    lastSenderType: string | null,
    now: Date,
  ): TicketSummaryResponseDto {
    const dto = new TicketSummaryResponseDto();
    dto.ticketId            = ticket.id;
    dto.maTicket            = ticket.ticketCode;
    dto.khachHangId         = ticket.customerId;
    dto.khachHangTen        = (ticket.customer as any)?.hoTen ?? '';
    dto.khachHangEmail      = (ticket.customer as any)?.email ?? '';
    dto.loaiVanDe           = ticket.issueType;
    dto.mucDoUuTien         = ticket.priority;
    dto.tieuDe              = ticket.title;
    dto.kenhLienHe          = ticket.channel;
    dto.trangThai           = ticket.status;
    dto.nhanVienPhuTrachId  = ticket.assignedToId ?? undefined;
    dto.nhanVienPhuTrachMa  = (ticket.assignedTo as any)?.maNhanVien ?? undefined;
    dto.nhanVienPhuTrachTen = (ticket.assignedTo as any)?.hoTen ?? undefined;
    dto.nhanVienPhuTrachAvatar = (ticket.assignedTo as any)?.anhDaiDien ?? undefined;
    dto.messageCount        = messageCount;
    dto.lastMessageAt       = lastMessageAt?.toISOString() ?? undefined;
    dto.lastSenderType      = lastSenderType ?? undefined;
    dto.ngayTao             = ticket.createdAt instanceof Date ? ticket.createdAt.toISOString() : String(ticket.createdAt);
    dto.slaDeadline         = ticket.slaDeadline instanceof Date ? ticket.slaDeadline.toISOString() : undefined;
    dto.isSlaBreached       = !!(
      ticket.slaDeadline &&
      new Date(ticket.slaDeadline) < now &&
      ticket.status !== TicketStatus.DaDong &&
      ticket.status !== TicketStatus.DaGiaiQuyet
    );
    return dto;
  }
}
