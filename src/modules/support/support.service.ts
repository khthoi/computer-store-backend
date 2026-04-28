import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Subject } from 'rxjs';
import { SupportTicket } from './entities/support-ticket.entity';
import { TicketMessage } from './entities/ticket-message.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';

// SLA hours by priority
const SLA_HOURS: Record<string, number> = {
  Cao: 4,
  TrungBinh: 24,
  Thap: 48,
};

@Injectable()
export class SupportService {
  // Per-ticket SSE subjects for real-time streaming
  private readonly ticketStreams = new Map<number, Subject<{ data: unknown }>>();

  constructor(
    @InjectRepository(SupportTicket)
    private readonly ticketRepo: Repository<SupportTicket>,
    @InjectRepository(TicketMessage)
    private readonly messageRepo: Repository<TicketMessage>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Customer ─────────────────────────────────────────────────────────────

  async createTicket(dto: CreateTicketDto, customerId: number): Promise<SupportTicket> {
    const now = new Date();
    const slaHours = SLA_HOURS[dto.priority ?? 'TrungBinh'] ?? 24;
    const slaDeadline = new Date(now.getTime() + slaHours * 60 * 60 * 1000);

    const ticket = this.ticketRepo.create({
      ticketCode: this.generateTicketCode(),
      customerId,
      orderId: dto.orderId ?? null,
      issueType: dto.issueType,
      priority: dto.priority ?? 'TrungBinh',
      title: dto.title,
      description: dto.description,
      channel: dto.channel,
      tags: dto.tags ?? null,
      status: 'Moi',
      slaDeadline,
    });
    return this.ticketRepo.save(ticket);
  }

  getMyTickets(customerId: number, query: QueryTicketsDto) {
    const qb = this.ticketRepo.createQueryBuilder('t')
      .where('t.khach_hang_id = :customerId', { customerId });

    if (query.status) qb.andWhere('t.trang_thai = :status', { status: query.status });

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return qb
      .orderBy('t.ngay_tao', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount()
      .then(([items, total]) => ({ items, total, page, limit, totalPages: Math.ceil(total / limit) }));
  }

  async getMyTicketDetail(ticketId: number, customerId: number): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId, customerId } });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại hoặc không thuộc về bạn');
    return ticket;
  }

  // Customer can send a reply to an existing ticket
  async sendCustomerMessage(
    ticketId: number,
    dto: SendMessageDto,
    customerId: number,
  ): Promise<TicketMessage> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId, customerId } });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại hoặc không thuộc về bạn');
    if (ticket.status === 'DaDong') {
      throw new BadRequestException('Ticket đã đóng, không thể gửi thêm tin nhắn');
    }

    const message = await this.messageRepo.save(
      this.messageRepo.create({
        ticketId,
        senderType: 'KhachHang',
        senderId: customerId,
        content: dto.content,
        messageType: 'Reply',
        newStatus: null,
      }),
    );

    // Reopen if ticket was waiting for customer response
    if (ticket.status === 'ChoDongY') {
      await this.ticketRepo.update(ticketId, { status: 'DangXuLy' });
    }

    this.emitToStream(ticketId, { type: 'message', data: message });
    return message;
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async findAll(query: QueryTicketsDto) {
    const qb = this.ticketRepo.createQueryBuilder('t');

    if (query.status) qb.andWhere('t.trang_thai = :status', { status: query.status });
    if (query.priority) qb.andWhere('t.muc_do_uu_tien = :priority', { priority: query.priority });

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await qb
      .orderBy('t.ngay_tao', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getTicketDetail(ticketId: number): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException(`Ticket #${ticketId} không tồn tại`);
    return ticket;
  }

  async assignTicket(ticketId: number, dto: AssignTicketDto): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException(`Ticket #${ticketId} không tồn tại`);

    ticket.assignedToId = dto.employeeId;
    if (ticket.status === 'Moi') ticket.status = 'DangXuLy';
    return this.ticketRepo.save(ticket);
  }

  async sendStaffMessage(
    ticketId: number,
    dto: SendMessageDto,
    employeeId: number,
  ): Promise<TicketMessage> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException(`Ticket #${ticketId} không tồn tại`);
    if (ticket.status === 'DaDong') {
      throw new BadRequestException('Ticket đã đóng');
    }

    const isPublicReply = dto.messageType !== 'InternalNote';
    const message = await this.messageRepo.save(
      this.messageRepo.create({
        ticketId,
        senderType: 'NhanVien',
        senderId: employeeId,
        content: dto.content,
        messageType: dto.messageType ?? 'Reply',
        newStatus: null,
      }),
    );

    // Set first_response_at on the very first staff public reply
    if (isPublicReply && !ticket.firstResponseAt) {
      await this.ticketRepo.update(ticketId, { firstResponseAt: new Date() });
    }

    // Move ticket to ChoDongY after staff replies publicly (awaiting customer confirmation)
    if (isPublicReply && ticket.status === 'DangXuLy') {
      await this.ticketRepo.update(ticketId, { status: 'ChoDongY' });
    }

    this.emitToStream(ticketId, { type: 'message', data: message });
    return message;
  }

  async closeTicket(ticketId: number, employeeId: number): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException(`Ticket #${ticketId} không tồn tại`);
    if (ticket.status === 'DaDong') {
      throw new BadRequestException('Ticket đã đóng');
    }

    ticket.status = 'DaDong';
    ticket.closedAt = new Date();
    const saved = await this.ticketRepo.save(ticket);

    await this.messageRepo.save(
      this.messageRepo.create({
        ticketId,
        senderType: 'HeThong',
        senderId: null,
        content: `Ticket đã được đóng bởi nhân viên #${employeeId}`,
        messageType: 'SystemLog',
        newStatus: 'DaDong',
      }),
    );

    this.emitToStream(ticketId, { type: 'closed', data: { ticketId } });
    return saved;
  }

  async reopenTicket(ticketId: number): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException(`Ticket #${ticketId} không tồn tại`);
    if (ticket.status !== 'DaDong') {
      throw new BadRequestException('Chỉ có thể mở lại ticket đã đóng');
    }

    ticket.status = 'MoLai';
    ticket.reopenCount += 1;
    ticket.closedAt = null;
    return this.ticketRepo.save(ticket);
  }

  getMessages(ticketId: number) {
    return this.messageRepo.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
    });
  }

  // ─── SSE Stream ───────────────────────────────────────────────────────────

  getTicketStream(ticketId: number): Subject<{ data: unknown }> {
    if (!this.ticketStreams.has(ticketId)) {
      this.ticketStreams.set(ticketId, new Subject());
    }
    return this.ticketStreams.get(ticketId)!;
  }

  private emitToStream(ticketId: number, payload: unknown): void {
    const subject = this.ticketStreams.get(ticketId);
    if (subject) subject.next({ data: payload });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private generateTicketCode(): string {
    const now = new Date();
    const datePart = now.toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TK-${datePart}-${rand}`;
  }
}
