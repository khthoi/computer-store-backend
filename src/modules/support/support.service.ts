import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Subject } from 'rxjs';
import { SupportTicket } from './entities/support-ticket.entity';
import { TicketMessage } from './entities/ticket-message.entity';
import { TicketAttachment } from './entities/ticket-attachment.entity';
import { Employee } from '../employees/entities/employee.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { UpdateTicketMetaDto } from './dto/update-ticket-meta.dto';
import { TicketMessageResponseDto } from './dto/ticket-message-response.dto';
import { TicketPriority, TicketStatus } from './support.enums';

const SLA_HOURS: Record<string, number> = { KhanCap: 1, Cao: 4, TrungBinh: 24, Thap: 48 };

@Injectable()
export class SupportService {
  private readonly ticketStreams = new Map<number, Subject<{ data: unknown }>>();

  constructor(
    @InjectRepository(SupportTicket)
    private readonly ticketRepo: Repository<SupportTicket>,
    @InjectRepository(TicketMessage)
    private readonly messageRepo: Repository<TicketMessage>,
    @InjectRepository(TicketAttachment)
    private readonly attachmentRepo: Repository<TicketAttachment>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Customer ─────────────────────────────────────────────────────────────

  async createTicket(dto: CreateTicketDto, customerId: number): Promise<SupportTicket> {
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + (SLA_HOURS[dto.priority ?? TicketPriority.TrungBinh] ?? 24) * 3_600_000);
    const ticket = this.ticketRepo.create({
      ticketCode: this.generateTicketCode(),
      customerId,
      orderId: dto.orderId ?? null,
      issueType: dto.issueType,
      priority: dto.priority ?? TicketPriority.TrungBinh,
      title: dto.title,
      description: dto.description,
      channel: dto.channel,
      status: TicketStatus.Moi,
      slaDeadline,
    });
    return this.ticketRepo.save(ticket);
  }

  getMyTickets(customerId: number, query: QueryTicketsDto) {
    const qb = this.ticketRepo.createQueryBuilder('t')
      .where('t.customerId = :customerId', { customerId });
    if (query.status) qb.andWhere('t.status = :status', { status: query.status });
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return qb
      .orderBy('t.createdAt', 'DESC')
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

  async sendCustomerMessage(ticketId: number, dto: SendMessageDto, customerId: number): Promise<TicketMessage> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId, customerId } });
    if (!ticket) throw new NotFoundException('Ticket không tồn tại hoặc không thuộc về bạn');
    if (ticket.status === TicketStatus.DaDong) throw new BadRequestException('Ticket đã đóng, không thể gửi thêm tin nhắn');

    await this.ticketRepo.save(ticket);
    const message = await this.messageRepo.save(
      this.messageRepo.create({ ticketId, senderType: 'KhachHang', senderId: customerId, content: dto.content, messageType: 'Reply', newStatus: null }),
    );
    this.emitToStream(ticketId, { type: 'message', data: message });
    return message;
  }

  // ─── Admin mutations ──────────────────────────────────────────────────────

  async assignTicket(ticketId: number, dto: AssignTicketDto): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException(`Ticket #${ticketId} không tồn tại`);

    const oldAssigneeId = ticket.assignedToId;
    const newEmployeeId = dto.employeeId ?? null;

    // No-op if assigning the same person
    if (oldAssigneeId === newEmployeeId) return ticket;

    ticket.assignedToId = newEmployeeId;
    if (newEmployeeId && ticket.status === TicketStatus.Moi) ticket.status = TicketStatus.DangXuLy;
    const saved = await this.ticketRepo.save(ticket);

    const [oldName, newName] = await Promise.all([
      oldAssigneeId ? this.getEmployeeName(oldAssigneeId) : Promise.resolve(null),
      newEmployeeId ? this.getEmployeeName(newEmployeeId) : Promise.resolve(null),
    ]);

    let logContent: string;
    if (!oldAssigneeId && newEmployeeId) {
      logContent = `${newName} đã được phân công hỗ trợ ticket này`;
    } else if (oldAssigneeId && !newEmployeeId) {
      logContent = `Đã huỷ phân công (trước đây: ${oldName})`;
    } else {
      logContent = `Chuyển phân công: ${oldName} → ${newName}`;
    }

    await this.messageRepo.save(
      this.messageRepo.create({ ticketId, senderType: 'HeThong', senderId: null, content: logContent, messageType: 'SystemLog', newStatus: null }),
    );
    this.emitToStream(ticketId, { type: 'assigned', data: { ticketId, assignedToId: newEmployeeId } });
    return saved;
  }

  async sendStaffMessage(ticketId: number, dto: SendMessageDto, employeeId: number): Promise<TicketMessageResponseDto> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId }, relations: ['customer'] });
    if (!ticket) throw new NotFoundException(`Ticket #${ticketId} không tồn tại`);
    if (ticket.status === TicketStatus.DaDong) throw new BadRequestException('Ticket đã đóng');

    if (!ticket.assignedToId) {
      // Auto-assign: first employee to reply becomes the assignee
      ticket.assignedToId = employeeId;
      if (ticket.status === TicketStatus.Moi) ticket.status = TicketStatus.DangXuLy;
      const empName = await this.getEmployeeName(employeeId);
      await this.messageRepo.save(
        this.messageRepo.create({ ticketId, senderType: 'HeThong', senderId: null, content: `${empName} đã nhận và đang xử lý ticket này`, messageType: 'SystemLog', newStatus: null }),
      );
      this.emitToStream(ticketId, { type: 'assigned', data: { ticketId, assignedToId: employeeId } });
    } else if (ticket.assignedToId !== employeeId) {
      const canBypass = await this.hasTicketEditPermission(employeeId);
      if (!canBypass) {
        throw new ForbiddenException('Bạn không được phân công xử lý ticket này');
      }
    }

    const isPublicReply = dto.messageType !== 'InternalNote';
    if (isPublicReply && !ticket.firstResponseAt) ticket.firstResponseAt = new Date();
    await this.ticketRepo.save(ticket);

    const message = await this.messageRepo.save(
      this.messageRepo.create({ ticketId, senderType: 'NhanVien', senderId: employeeId, content: dto.content, messageType: dto.messageType ?? 'Reply', newStatus: null }),
    );
    this.emitToStream(ticketId, { type: 'message', data: message });

    const sender = await this.dataSource.getRepository(Employee).findOne({
      where: { id: employeeId },
      select: ['id', 'hoTen', 'anhDaiDien'],
    });
    return TicketMessageResponseDto.from(message, sender?.hoTen ?? 'Nhân viên', sender?.anhDaiDien, []);
  }

  async closeTicket(ticketId: number, employeeId: number): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException(`Ticket #${ticketId} không tồn tại`);
    if (ticket.status === TicketStatus.DaDong) throw new BadRequestException('Ticket đã đóng');
    ticket.status = TicketStatus.DaDong;
    ticket.closedAt = new Date();
    const saved = await this.ticketRepo.save(ticket);
    await this.messageRepo.save(
      this.messageRepo.create({ ticketId, senderType: 'HeThong', senderId: null, content: `Ticket đã được đóng bởi nhân viên #${employeeId}`, messageType: 'SystemLog', newStatus: TicketStatus.DaDong }),
    );
    this.emitToStream(ticketId, { type: 'closed', data: { ticketId } });
    return saved;
  }

  async resolveTicket(ticketId: number, employeeId: number): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException(`Ticket #${ticketId} không tồn tại`);
    if (ticket.status === TicketStatus.DaDong) throw new BadRequestException('Ticket đã đóng hoàn toàn');
    if (ticket.status === TicketStatus.DaGiaiQuyet) throw new BadRequestException('Ticket đã được giải quyết');
    ticket.status = TicketStatus.DaGiaiQuyet;
    ticket.resolvedAt = new Date();
    const saved = await this.ticketRepo.save(ticket);
    await this.messageRepo.save(
      this.messageRepo.create({ ticketId, senderType: 'HeThong', senderId: null, content: `Ticket đã được đánh dấu giải quyết bởi nhân viên #${employeeId}`, messageType: 'SystemLog', newStatus: TicketStatus.DaGiaiQuyet }),
    );
    this.emitToStream(ticketId, { type: 'resolved', data: { ticketId } });
    return saved;
  }

  async updateTicketMeta(ticketId: number, dto: UpdateTicketMetaDto): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException(`Ticket #${ticketId} không tồn tại`);
    if (dto.priority !== undefined) ticket.priority = dto.priority;
    return this.ticketRepo.save(ticket);
  }

  async reopenTicket(ticketId: number): Promise<SupportTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException(`Ticket #${ticketId} không tồn tại`);
    if (ticket.status !== TicketStatus.DaDong && ticket.status !== TicketStatus.DaGiaiQuyet) {
      throw new BadRequestException('Chỉ có thể mở lại ticket đã đóng hoặc đã giải quyết');
    }
    ticket.status = TicketStatus.DangXuLy;
    ticket.reopenCount += 1;
    ticket.closedAt = null;
    ticket.resolvedAt = null;
    return this.ticketRepo.save(ticket);
  }

  // ─── Message loading (used by admin query service + controller) ───────────

  async loadMessages(ticket: SupportTicket): Promise<TicketMessageResponseDto[]> {
    const messages = await this.messageRepo.find({
      where: { ticketId: ticket.id },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });
    const messageIds = messages.map(m => m.id);
    const attachments = messageIds.length > 0
      ? await this.attachmentRepo.find({ where: { messageId: In(messageIds) } })
      : [];
    const attMap = new Map<number, TicketAttachment[]>();
    for (const att of attachments) {
      if (!attMap.has(att.messageId)) attMap.set(att.messageId, []);
      attMap.get(att.messageId)!.push(att);
    }
    return messages.map(msg => {
      const senderName = msg.senderType === 'NhanVien'
        ? msg.sender?.hoTen ?? 'Nhân viên'
        : msg.senderType === 'KhachHang'
          ? (ticket.customer as any)?.hoTen ?? 'Khách hàng'
          : 'Hệ thống';
      const senderAvatar = msg.senderType === 'NhanVien' ? msg.sender?.anhDaiDien : null;
      return TicketMessageResponseDto.from(msg, senderName, senderAvatar, attMap.get(msg.id) ?? []);
    });
  }

  async getMessages(ticketId: number): Promise<TicketMessageResponseDto[]> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId }, relations: ['customer'] });
    if (!ticket) throw new NotFoundException(`Ticket #${ticketId} không tồn tại`);
    return this.loadMessages(ticket);
  }

  // ─── SSE Stream ───────────────────────────────────────────────────────────

  getTicketStream(ticketId: number): Subject<{ data: unknown }> {
    if (!this.ticketStreams.has(ticketId)) this.ticketStreams.set(ticketId, new Subject());
    return this.ticketStreams.get(ticketId)!;
  }

  private emitToStream(ticketId: number, payload: unknown): void {
    this.ticketStreams.get(ticketId)?.next({ data: payload });
  }

  private async getEmployeeName(employeeId: number): Promise<string> {
    const emp = await this.dataSource.getRepository(Employee).findOne({
      where: { id: employeeId },
      select: ['id', 'hoTen'],
    });
    return emp?.hoTen ?? `Nhân viên #${employeeId}`;
  }

  private async hasTicketEditPermission(employeeId: number): Promise<boolean> {
    const count = await this.dataSource.getRepository(Employee)
      .createQueryBuilder('e')
      .innerJoin('e.roles', 'r')
      .innerJoin('r.permissions', 'p')
      .where('e.id = :eid', { eid: employeeId })
      .andWhere('p.module = :m', { m: 'support' })
      .andWhere('p.hanhDong = :h', { h: 'update' })
      .getCount();
    return count > 0;
  }

  private generateTicketCode(): string {
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TK-${datePart}-${rand}`;
  }
}
