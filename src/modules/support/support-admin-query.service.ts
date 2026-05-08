import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { SupportTicket } from './entities/support-ticket.entity';
import { TicketAttachment } from './entities/ticket-attachment.entity';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { AdminCreateTicketDto } from './dto/admin-create-ticket.dto';
import { TicketSummaryResponseDto } from './dto/ticket-summary-response.dto';
import { TicketDetailResponseDto } from './dto/ticket-detail-response.dto';
import { TicketStatsResponseDto } from './dto/ticket-stats-response.dto';
import { SupportService } from './support.service';
import { TicketStatus } from './support.enums';

const SLA_HOURS: Record<string, number> = { Cao: 4, TrungBinh: 24, Thap: 48 };

@Injectable()
export class SupportAdminQueryService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly ticketRepo: Repository<SupportTicket>,
    @InjectRepository(TicketAttachment)
    private readonly attachmentRepo: Repository<TicketAttachment>,
    private readonly dataSource: DataSource,
    private readonly supportService: SupportService,
  ) {}

  async findAll(query: QueryTicketsDto, currentEmployeeId?: number) {
    const qb = this.ticketRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.customer', 'c')
      .leftJoinAndSelect('t.assignedTo', 'emp');

    if (query.status)     qb.andWhere('t.status = :status', { status: query.status });
    if (query.priority)   qb.andWhere('t.priority = :priority', { priority: query.priority });
    if (query.loaiVanDe)  qb.andWhere('t.issueType = :issueType', { issueType: query.loaiVanDe });
    if (query.assignedTo) qb.andWhere('t.assignedToId = :assignedTo', { assignedTo: query.assignedTo });
    if (query.myOnly && currentEmployeeId) {
      qb.andWhere('t.assignedToId = :myId', { myId: currentEmployeeId });
    }
    if (query.dateFrom)   qb.andWhere('DATE(t.ngay_cap_nhat) >= :dateFrom', { dateFrom: query.dateFrom });
    if (query.dateTo)     qb.andWhere('DATE(t.ngay_cap_nhat) <= :dateTo',   { dateTo:   query.dateTo   });
    if (query.search) {
      qb.andWhere(
        '(t.title LIKE :q OR t.ticketCode LIKE :q OR c.hoTen LIKE :q)',
        { q: `%${query.search}%` },
      );
    }

    const page  = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await qb
      .orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const ticketIds = items.map(t => t.id);
    const msgStats  = ticketIds.length > 0
      ? await this.dataSource.createQueryBuilder()
          .select('tm.ticket_id', 'ticketId')
          .addSelect('COUNT(*)', 'messageCount')
          .addSelect('MAX(tm.created_at)', 'lastMessageAt')
          .addSelect(
            `SUBSTRING_INDEX(GROUP_CONCAT(tm.sender_type ORDER BY tm.created_at DESC SEPARATOR ','), ',', 1)`,
            'lastSenderType',
          )
          .from('ticket_message', 'tm')
          .where('tm.ticket_id IN (:...ticketIds)', { ticketIds })
          .groupBy('tm.ticket_id')
          .getRawMany<{ ticketId: string; messageCount: string; lastMessageAt: string | null; lastSenderType: string | null }>()
      : [];

    const statsMap = new Map(msgStats.map(s => [Number(s.ticketId), s]));
    const now = new Date();

    return {
      data: items.map(t => {
        const s = statsMap.get(t.id);
        return TicketSummaryResponseDto.from(
          t,
          s ? Number(s.messageCount) : 0,
          s?.lastMessageAt ? new Date(s.lastMessageAt) : null,
          s?.lastSenderType ?? null,
          now,
        );
      }),
      total, page, limit, totalPages: Math.ceil(total / limit),
    };
  }

  async getTicketDetail(ticketId: number): Promise<TicketDetailResponseDto> {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['customer', 'assignedTo', 'order'],
    });
    if (!ticket) throw new NotFoundException(`Ticket #${ticketId} không tồn tại`);
    const messages = await this.supportService.loadMessages(ticket);
    const lastAt   = messages.length ? new Date(messages[messages.length - 1].createdAt) : null;
    return TicketDetailResponseDto.from(ticket, messages, messages.length, lastAt, new Date());
  }

  async getTicketStats(): Promise<TicketStatsResponseDto> {
    const now = new Date();
    const [tongSoTicket, dangMo, chuaXuLy, khanCap, slaBreached] = await Promise.all([
      this.ticketRepo.count(),
      this.ticketRepo.count({ where: [
        { status: TicketStatus.Moi }, { status: TicketStatus.DangXuLy },
      ]}),
      this.ticketRepo.count({ where: { status: TicketStatus.Moi, assignedToId: IsNull() } }),
      this.ticketRepo.createQueryBuilder('t')
        .where('t.priority = :p', { p: 'KhanCap' })
        .andWhere('t.status NOT IN (:...closed)', { closed: ['DaDong', 'DaGiaiQuyet'] })
        .getCount(),
      this.ticketRepo.createQueryBuilder('t')
        .where('t.slaDeadline < :now', { now })
        .andWhere('t.status NOT IN (:...closed)', { closed: ['DaDong', 'DaGiaiQuyet'] })
        .getCount(),
    ]);

    const finished = await this.ticketRepo.createQueryBuilder('t')
      .select(['t.createdAt', 't.closedAt', 't.resolvedAt'])
      .where('t.closedAt IS NOT NULL OR t.resolvedAt IS NOT NULL')
      .getMany();

    const trungBinhGiaiQuyet = finished.length > 0
      ? Math.round(
          finished.reduce((sum, t) => {
            const endTime = t.resolvedAt ?? t.closedAt;
            return sum + (endTime!.getTime() - t.createdAt.getTime()) / 3_600_000;
          }, 0) / finished.length,
        )
      : 0;

    return { tongSoTicket, dangMo, chuaXuLy, khanCap, slaBreached, trungBinhGiaiQuyet };
  }

  async getAssigneeStats(): Promise<{ employeeId: number; openCount: number }[]> {
    const rows = await this.ticketRepo
      .createQueryBuilder('t')
      .select('t.assignedToId', 'employeeId')
      .addSelect('COUNT(*)', 'openCount')
      .where('t.assignedToId IS NOT NULL')
      .andWhere('t.status NOT IN (:...closed)', { closed: [TicketStatus.DaDong, TicketStatus.DaGiaiQuyet] })
      .groupBy('t.assignedToId')
      .getRawMany<{ employeeId: string; openCount: string }>();
    return rows.map(r => ({ employeeId: Number(r.employeeId), openCount: Number(r.openCount) }));
  }

  async adminCreateTicket(dto: AdminCreateTicketDto): Promise<TicketDetailResponseDto> {
    const now       = new Date();
    const slaHours  = SLA_HOURS[dto.priority] ?? 24;
    const slaDeadline = new Date(now.getTime() + slaHours * 60 * 60 * 1000);
    const ticket = await this.ticketRepo.save(
      this.ticketRepo.create({
        ticketCode:   this.generateTicketCode(),
        customerId:   dto.customerId,
        orderId:      dto.orderId ?? null,
        issueType:    dto.issueType,
        priority:     dto.priority,
        title:        dto.title,
        description:  dto.description,
        channel:      dto.channel,
        status:       TicketStatus.Moi,
        slaDeadline,
      }),
    );
    return this.getTicketDetail(ticket.id);
  }

  private generateTicketCode(): string {
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const rand     = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TK-${datePart}-${rand}`;
  }
}
