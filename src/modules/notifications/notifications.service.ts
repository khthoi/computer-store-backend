import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from 'rxjs';
import { Notification } from './entities/notification.entity';
import { AutoNotificationConfig } from './entities/auto-notification-config.entity';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class NotificationsService {
  // Single global stream pushed to admin SSE
  private readonly adminStream$ = new Subject<{ data: unknown }>();

  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @InjectRepository(AutoNotificationConfig)
    private readonly configRepo: Repository<AutoNotificationConfig>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ─── Customer ─────────────────────────────────────────────────────────────

  async getMyNotifications(customerId: number, query: QueryNotificationsDto) {
    const qb = this.notifRepo.createQueryBuilder('n')
      .where('n.khach_hang_id = :customerId', { customerId });

    if (query.unreadOnly) {
      qb.andWhere('n.da_doc = false');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await qb
      .orderBy('n.ngay_tao', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const unreadCount = await this.notifRepo.count({
      where: { customerId, isRead: false },
    });

    return { items, total, page, limit, totalPages: Math.ceil(total / limit), unreadCount };
  }

  async markRead(id: number, customerId: number): Promise<Notification> {
    const notif = await this.notifRepo.findOne({ where: { id } });
    if (!notif) throw new NotFoundException(`Thông báo #${id} không tồn tại`);
    if (notif.customerId !== customerId) throw new ForbiddenException();

    notif.isRead = true;
    return this.notifRepo.save(notif);
  }

  async markAllRead(customerId: number): Promise<{ updated: number }> {
    const result = await this.notifRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where('khach_hang_id = :customerId AND da_doc = false', { customerId })
      .execute();

    return { updated: result.affected ?? 0 };
  }

  // ─── Dispatch ─────────────────────────────────────────────────────────────

  async dispatch(
    triggerKey: string,
    customerId: number,
    vars: Record<string, string> = {},
    relatedEntity?: string,
    relatedEntityId?: number,
  ): Promise<void> {
    const config = await this.configRepo.findOne({
      where: { triggerKey, isActive: true },
    });
    if (!config) return; // no active config — silently skip

    for (const channel of config.channels) {
      const notif = this.notifRepo.create({
        customerId,
        type: triggerKey,
        title: this.interpolate(config.templateTitle, vars),
        content: this.interpolate(config.templateContent, vars),
        channel,
        status: 'DaGui',
        isRead: false,
        relatedEntity: relatedEntity ?? null,
        relatedEntityId: relatedEntityId ?? null,
      });
      const saved = await this.notifRepo.save(notif);

      // Push to admin real-time stream
      this.adminStream$.next({
        data: { type: 'notification', customerId, triggerKey, id: saved.id },
      });
    }
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  getAdminStream(): Subject<{ data: unknown }> {
    return this.adminStream$;
  }

  findAllConfigs() {
    return this.configRepo.find({ order: { triggerKey: 'ASC' } });
  }

  async findOneConfig(id: number): Promise<AutoNotificationConfig> {
    const cfg = await this.configRepo.findOne({ where: { id } });
    if (!cfg) throw new NotFoundException(`Config #${id} không tồn tại`);
    return cfg;
  }

  async createConfig(dto: CreateConfigDto, employeeId: number): Promise<AutoNotificationConfig> {
    const cfg = this.configRepo.create({ ...dto, updatedById: employeeId });
    const saved = await this.configRepo.save(cfg);
    this.auditLogsService.log({
      entityType: 'CauHinhThongBao',
      entityId: String(saved.id),
      entityLabel: saved.displayName,
      actionType: 'TaoMoi',
      actionDetail: `Tạo cấu hình thông báo tự động "${saved.displayName}" (${saved.triggerKey})`,
      after: JSON.stringify({ id: saved.id, triggerKey: saved.triggerKey, displayName: saved.displayName, channels: saved.channels, isActive: saved.isActive }),
    });
    return saved;
  }

  async updateConfig(id: number, dto: UpdateConfigDto, employeeId: number): Promise<AutoNotificationConfig> {
    const cfg = await this.findOneConfig(id);
    const before = { triggerKey: cfg.triggerKey, displayName: cfg.displayName, channels: cfg.channels, templateTitle: cfg.templateTitle, templateContent: cfg.templateContent, isActive: cfg.isActive };
    Object.assign(cfg, dto, { updatedById: employeeId });
    const saved = await this.configRepo.save(cfg);
    this.auditLogsService.log({
      entityType: 'CauHinhThongBao',
      entityId: String(id),
      entityLabel: saved.displayName,
      actionType: 'CapNhat',
      actionDetail: `Cập nhật cấu hình thông báo tự động "${saved.displayName}"`,
      before: JSON.stringify(before),
      after: JSON.stringify({ displayName: saved.displayName, channels: saved.channels, templateTitle: saved.templateTitle, isActive: saved.isActive }),
    });
    return saved;
  }

  async deleteConfig(id: number): Promise<void> {
    const cfg = await this.findOneConfig(id);
    const snapshot = { id: cfg.id, triggerKey: cfg.triggerKey, displayName: cfg.displayName, channels: cfg.channels, isActive: cfg.isActive };
    await this.configRepo.remove(cfg);
    this.auditLogsService.log({
      entityType: 'CauHinhThongBao',
      entityId: String(snapshot.id),
      entityLabel: snapshot.displayName,
      actionType: 'Xoa',
      actionDetail: `Xóa cấu hình thông báo tự động "${snapshot.displayName}" (${snapshot.triggerKey})`,
      before: JSON.stringify(snapshot),
    });
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  private interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  }
}
