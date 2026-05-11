import { SystemAuditLog } from '../entities/system-audit-log.entity';

export class AuditLogDiffDto {
  before: string;
  after: string;
}

function parseActorRoles(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as string[];
    return [String(parsed)];
  } catch {
    return raw ? [raw] : [];
  }
}

export class AuditLogResponseDto {
  id: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  actionType: string;
  actionDetail: string;
  actorId: number | null;
  actorName: string;
  actorCode: string | null;
  actorRoles: string[];
  actorAvatarUrl?: string;
  ipAddress?: string;
  userAgent?: string;
  diff?: AuditLogDiffDto;
  createdAt: string;

  static fromEntity(e: SystemAuditLog): AuditLogResponseDto {
    const dto = new AuditLogResponseDto();
    dto.id = String(e.id);
    dto.entityType = e.entityType;
    dto.entityId = e.entityId;
    dto.entityLabel = e.entityLabel;
    dto.actionType = e.actionType;
    dto.actionDetail = e.actionDetail;
    dto.actorId = e.actorId;
    dto.actorName = e.actorName;
    dto.actorCode = e.actorCode ?? null;
    dto.actorRoles = parseActorRoles(e.actorRole ?? '');
    if (e.actorAvatarUrl) dto.actorAvatarUrl = e.actorAvatarUrl;
    if (e.ipAddress) dto.ipAddress = e.ipAddress;
    if (e.userAgent) dto.userAgent = e.userAgent;
    if (e.before !== null || e.after !== null) {
      dto.diff = { before: e.before ?? '{}', after: e.after ?? '{}' };
    }
    dto.createdAt = e.createdAt instanceof Date ? e.createdAt.toISOString() : String(e.createdAt);
    return dto;
  }
}
