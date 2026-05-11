import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClsService } from 'nestjs-cls';
import { SystemAuditLog } from './entities/system-audit-log.entity';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';

export interface AuditLogPayload {
  entityType: string;
  entityId: string;
  entityLabel: string;
  actionType: string;
  actionDetail: string;
  before?: string;
  after?: string;
  // Explicit actor — wins over ClsService (use for events where JWT is not in context, e.g. login)
  actor?: {
    actorId: number | null;
    actorName: string;
    actorCode?: string | null;
    /** Pass array for multiple roles; pass string for legacy single-role events */
    actorRole: string | string[];
    actorAvatarUrl?: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(SystemAuditLog)
    private readonly repo: Repository<SystemAuditLog>,
    private readonly cls: ClsService,
  ) {}

  // Fire-and-forget — never throws, never blocks business operations
  log(payload: AuditLogPayload): void {
    this.doInsert(payload).catch(() => {});
  }

  private serializeRoles(role: string | string[] | undefined | null): string {
    if (!role) return JSON.stringify([]);
    return Array.isArray(role) ? JSON.stringify(role) : JSON.stringify([role]);
  }

  private async doInsert(payload: AuditLogPayload): Promise<void> {
    const actorRole = payload.actor
      ? this.serializeRoles(payload.actor.actorRole)
      : (this.cls.get<string>('actorRole') ?? '[]');
    const record = this.repo.create({
      entityType: payload.entityType,
      entityId: payload.entityId,
      entityLabel: payload.entityLabel,
      actionType: payload.actionType,
      actionDetail: payload.actionDetail,
      before: payload.before ?? null,
      after: payload.after ?? null,
      actorId: payload.actor?.actorId ?? this.cls.get<number | null>('actorId') ?? null,
      actorName: payload.actor?.actorName ?? this.cls.get<string>('actorName') ?? 'Hệ thống',
      actorCode: payload.actor?.actorCode ?? this.cls.get<string | null>('actorCode') ?? null,
      actorRole,
      actorAvatarUrl: payload.actor?.actorAvatarUrl ?? this.cls.get<string | null>('actorAvatarUrl') ?? null,
      ipAddress: payload.actor?.ipAddress ?? this.cls.get<string | null>('ipAddress') ?? null,
      userAgent: payload.actor?.userAgent ?? this.cls.get<string | null>('userAgent') ?? null,
    });
    await this.repo.save(record);
  }

  async exportCsv(query: Omit<AuditLogQueryDto, 'page' | 'pageSize'>): Promise<string> {
    const qb = this.repo.createQueryBuilder('log').orderBy('log.createdAt', 'DESC');

    if (query.q) {
      qb.andWhere('(log.entityLabel LIKE :q OR log.actionDetail LIKE :q OR log.actorName LIKE :q)', { q: `%${query.q}%` });
    }
    if (query.entityType?.length) qb.andWhere('log.entityType IN (:...entityType)', { entityType: query.entityType });
    if (query.actionType?.length) qb.andWhere('log.actionType IN (:...actionType)', { actionType: query.actionType });
    if (query.entityId) qb.andWhere('log.entityId = :entityId', { entityId: query.entityId });
    if (query.actorId !== undefined) qb.andWhere('log.actorId = :actorId', { actorId: query.actorId });
    if (query.from) qb.andWhere('log.createdAt >= :from', { from: new Date(query.from) });
    if (query.to) {
      const toDate = new Date(query.to);
      toDate.setUTCHours(23, 59, 59, 999);
      qb.andWhere('log.createdAt <= :to', { to: toDate });
    }

    const rows = await qb.getMany();
    const header = 'ID,Thời gian,Loại đối tượng,ID đối tượng,Tên đối tượng,Hành động,Mô tả,Người thực hiện,Vai trò,IP\n';
    const body = rows.map((r) => [
      r.id,
      r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      r.entityType,
      r.entityId,
      `"${(r.entityLabel ?? '').replace(/"/g, '""')}"`,
      r.actionType,
      `"${(r.actionDetail ?? '').replace(/"/g, '""')}"`,
      `"${(r.actorName ?? '').replace(/"/g, '""')}"`,
      r.actorRole ?? '',
      r.ipAddress ?? '',
    ].join(',')).join('\n');

    return header + body;
  }

  async findAll(query: AuditLogQueryDto): Promise<{ data: AuditLogResponseDto[]; total: number }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.repo
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC');

    if (query.q) {
      qb.andWhere(
        '(log.entityLabel LIKE :q OR log.actionDetail LIKE :q OR log.actorName LIKE :q)',
        { q: `%${query.q}%` },
      );
    }

    if (query.entityType?.length) {
      qb.andWhere('log.entityType IN (:...entityType)', { entityType: query.entityType });
    }

    if (query.actionType?.length) {
      qb.andWhere('log.actionType IN (:...actionType)', { actionType: query.actionType });
    }

    if (query.entityId) {
      qb.andWhere('log.entityId = :entityId', { entityId: query.entityId });
    }

    if (query.actorId !== undefined) {
      qb.andWhere('log.actorId = :actorId', { actorId: query.actorId });
    }

    if (query.from) {
      qb.andWhere('log.createdAt >= :from', { from: new Date(query.from) });
    }

    if (query.to) {
      // Include the full end-of-day for the "to" date
      const toDate = new Date(query.to);
      toDate.setUTCHours(23, 59, 59, 999);
      qb.andWhere('log.createdAt <= :to', { to: toDate });
    }

    const [rows, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { data: rows.map(AuditLogResponseDto.fromEntity), total };
  }
}
