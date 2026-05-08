import { ApiProperty } from '@nestjs/swagger';
import { SupportTicket } from '../entities/support-ticket.entity';
import { TicketMessageResponseDto } from './ticket-message-response.dto';
import { TicketStatus } from '../support.enums';

export class TicketDetailResponseDto {
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
  @ApiProperty() moTa: string;
  @ApiProperty({ nullable: true }) donHangId?: number;
  @ApiProperty({ nullable: true }) donHangMa?: string;
  @ApiProperty({ nullable: true }) phanHoiDauLuc?: string;
  @ApiProperty({ nullable: true }) ngayDong?: string;
  @ApiProperty({ nullable: true }) daGiaiQuyetLuc?: string;
  @ApiProperty() soLanMoLai: number;
  @ApiProperty() ngayCapNhat: string;
  @ApiProperty({ type: [TicketMessageResponseDto] }) messages: TicketMessageResponseDto[];

  static from(
    ticket: SupportTicket,
    messages: TicketMessageResponseDto[],
    messageCount: number,
    lastMessageAt: Date | null,
    now: Date,
  ): TicketDetailResponseDto {
    const dto = new TicketDetailResponseDto();
    const customer  = ticket.customer as any;
    const assignedTo = ticket.assignedTo as any;
    dto.ticketId             = ticket.id;
    dto.maTicket             = ticket.ticketCode;
    dto.khachHangId          = ticket.customerId;
    dto.khachHangTen         = customer?.hoTen ?? '';
    dto.khachHangEmail       = customer?.email ?? '';
    dto.loaiVanDe            = ticket.issueType;
    dto.mucDoUuTien          = ticket.priority;
    dto.tieuDe               = ticket.title;
    dto.kenhLienHe           = ticket.channel;
    dto.trangThai            = ticket.status;
    dto.nhanVienPhuTrachId   = ticket.assignedToId ?? undefined;
    dto.nhanVienPhuTrachMa   = assignedTo?.maNhanVien ?? undefined;
    dto.nhanVienPhuTrachTen  = assignedTo?.hoTen ?? undefined;
    dto.nhanVienPhuTrachAvatar = assignedTo?.anhDaiDien ?? undefined;
    dto.messageCount         = messageCount;
    dto.lastMessageAt        = lastMessageAt?.toISOString() ?? undefined;
    dto.ngayTao              = ticket.createdAt instanceof Date ? ticket.createdAt.toISOString() : String(ticket.createdAt);
    dto.slaDeadline          = ticket.slaDeadline instanceof Date ? ticket.slaDeadline.toISOString() : undefined;
    dto.isSlaBreached        = !!(
      ticket.slaDeadline &&
      new Date(ticket.slaDeadline) < now &&
      ticket.status !== TicketStatus.DaDong &&
      ticket.status !== TicketStatus.DaGiaiQuyet
    );
    const lastNonSystemMsg   = [...messages].reverse().find(m => m.senderType !== 'HeThong');
    dto.lastSenderType       = lastNonSystemMsg?.senderType ?? undefined;
    dto.moTa                 = ticket.description;
    dto.donHangId            = ticket.orderId ?? undefined;
    dto.donHangMa            = (ticket.order as any)?.maDonHang ?? undefined;
    dto.phanHoiDauLuc        = ticket.firstResponseAt instanceof Date ? ticket.firstResponseAt.toISOString() : undefined;
    dto.ngayDong             = ticket.closedAt instanceof Date ? ticket.closedAt.toISOString() : undefined;
    dto.daGiaiQuyetLuc       = ticket.resolvedAt instanceof Date ? ticket.resolvedAt.toISOString() : undefined;
    dto.soLanMoLai           = ticket.reopenCount;
    dto.ngayCapNhat          = ticket.updatedAt instanceof Date ? ticket.updatedAt.toISOString() : String(ticket.updatedAt);
    dto.messages             = messages;
    return dto;
  }
}
