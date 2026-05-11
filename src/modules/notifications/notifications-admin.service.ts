import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { Customer } from '../users/entities/customer.entity';
import { MembershipTier } from '../loyalty/entities/membership-tier.entity';
import { Order } from '../orders/entities/order.entity';
import { Transaction } from '../payments/entities/transaction.entity';
import { NotificationsService } from './notifications.service';
import { QueryAdminNotificationsDto } from './dto/query-admin-notifications.dto';
import { NotificationAdminRow } from './dto/notification-admin-response.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

// Maps English aliases (used in frontend) → Vietnamese DB values stored in khach_hang.trang_thai
const STATUS_ALIAS_MAP: Record<string, string> = {
  active:     'HoatDong',
  pending:    'ChoXacMinh',
  banned:     'BiKhoa',
  // Pass-through: cho phép gửi thẳng DB value nếu cần
  HoatDong:   'HoatDong',
  ChoXacMinh: 'ChoXacMinh',
  BiKhoa:     'BiKhoa',
};

@Injectable()
export class NotificationsAdminService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(MembershipTier)
    private readonly tierRepo: Repository<MembershipTier>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async getAdminNotifications(dto: QueryAdminNotificationsDto) {
    const { kenhGui, trangThai, loaiThongBao, tuNgay, denNgay, q } = dto;
    const page  = dto.page  ?? 1;
    const limit = dto.limit ?? 20;

    const qb = this.notifRepo.createQueryBuilder('n')
      .leftJoinAndSelect('n.customer', 'kh');

    if (kenhGui?.length)      qb.andWhere('n.channel IN (:...kenhGui)',    { kenhGui });
    if (trangThai?.length)    qb.andWhere('n.status IN (:...trangThai)',   { trangThai });
    if (loaiThongBao?.length) qb.andWhere('n.type IN (:...loaiThongBao)', { loaiThongBao });
    if (tuNgay) qb.andWhere('n.createdAt >= :tuNgay', { tuNgay: new Date(tuNgay) });
    if (denNgay) {
      const d = new Date(denNgay);
      d.setDate(d.getDate() + 1);
      qb.andWhere('n.createdAt < :denNgay', { denNgay: d });
    }
    if (q) {
      qb.andWhere('(kh.hoTen LIKE :q OR kh.email LIKE :q OR n.title LIKE :q)', { q: `%${q}%` });
    }

    const [rows, total] = await qb
      .orderBy('n.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Batch-lookup maDonHang and maGiaoDichNgoai to avoid N+1
    const donHangIds = rows
      .filter((n) => n.relatedEntity === 'DonHang' && n.relatedEntityId !== null)
      .map((n) => n.relatedEntityId as number);
    const giaoDichIds = rows
      .filter((n) => n.relatedEntity === 'GiaoDich' && n.relatedEntityId !== null)
      .map((n) => n.relatedEntityId as number);

    const maDonHangMap = new Map<number, string>();
    const maGiaoDichNgoaiMap = new Map<number, string | null>();

    if (donHangIds.length) {
      const orders = await this.orderRepo.find({
        where: { id: In(donHangIds) },
        select: ['id', 'maDonHang'],
      });
      for (const o of orders) maDonHangMap.set(o.id, o.maDonHang);
    }

    if (giaoDichIds.length) {
      const txs = await this.transactionRepo.find({
        where: { id: In(giaoDichIds) },
        select: ['id', 'maGiaoDichNgoai'],
      });
      for (const t of txs) maGiaoDichNgoaiMap.set(t.id, t.maGiaoDichNgoai);
    }

    return {
      data: rows.map((n) => this.mapRow(
        n as Notification & { customer: Customer },
        maDonHangMap.get(n.relatedEntityId ?? -1) ?? null,
        maGiaoDichNgoaiMap.has(n.relatedEntityId ?? -1)
          ? maGiaoDichNgoaiMap.get(n.relatedEntityId ?? -1)!
          : null,
      )),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats() {
    const tongThongBao = await this.notifRepo.count();
    const chuaGui  = await this.notifRepo.count({ where: { status: 'ChuaGui' } });
    const daGui    = await this.notifRepo.count({ where: { status: 'DaGui' } });
    const thatBai  = await this.notifRepo.count({ where: { status: 'ThatBai' } });
    const huyBo    = await this.notifRepo.count({ where: { status: 'HuyBo' } });
    const pushDaGui = await this.notifRepo.count({ where: { channel: 'Push', status: 'DaGui' } });
    const pushDaDoc = await this.notifRepo.count({ where: { channel: 'Push', status: 'DaGui', isRead: true } });
    const tyLeDaDoc = pushDaGui > 0 ? Math.round((pushDaDoc / pushDaGui) * 100) : 0;

    return { tongThongBao, chuaGui, daGui, thatBai, huyBo, tyLeDaDoc };
  }

  async broadcastNotification(dto: BroadcastNotificationDto): Promise<{ created: number }> {
    const customerIds = await this.resolveCustomerIds(dto);
    const rows: Notification[] = [];

    for (const customerId of customerIds) {
      for (const channel of dto.kenhGui) {
        rows.push(this.notifRepo.create({
          customerId,
          type:            dto.loaiThongBao,
          title:           dto.tieuDe,
          content:         dto.noiDung,
          channel,
          status:          'ChuaGui',
          isRead:          false,
          relatedEntity:   dto.entityLienQuan   ?? null,
          relatedEntityId: dto.entityLienQuanId ?? null,
        }));
      }
    }

    await this.notifRepo.save(rows);

    this.auditLogsService.log({
      entityType: 'ThongBao',
      entityId: 'broadcast',
      entityLabel: dto.tieuDe,
      actionType: 'TaoMoi',
      actionDetail: `Broadcast "${dto.tieuDe}" tới ${customerIds.length} khách hàng qua ${dto.kenhGui.join(', ')}`,
      after: JSON.stringify({ count: rows.length, channels: dto.kenhGui, targetType: dto.targetType }),
    });

    this.notificationsService.getAdminStream().next({
      data: { type: 'broadcast', count: rows.length, channels: dto.kenhGui },
    });

    return { created: rows.length };
  }

  async cancelNotification(id: number): Promise<void> {
    const notif = await this.notifRepo.findOne({ where: { id } });
    if (!notif) throw new NotFoundException(`Thông báo #${id} không tồn tại`);
    if (notif.status !== 'ChuaGui')
      throw new BadRequestException(`Chỉ có thể hủy thông báo ở trạng thái ChuaGui`);
    const before = { trangThai: notif.status };
    notif.status = 'HuyBo';
    await this.notifRepo.save(notif);
    this.auditLogsService.log({
      entityType: 'ThongBao',
      entityId: String(id),
      entityLabel: notif.title,
      actionType: 'CapNhat',
      actionDetail: `Hủy thông báo #${id}`,
      before: JSON.stringify(before),
      after: JSON.stringify({ trangThai: 'HuyBo' }),
    });
  }

  async retryNotification(id: number): Promise<void> {
    const notif = await this.notifRepo.findOne({ where: { id } });
    if (!notif) throw new NotFoundException(`Thông báo #${id} không tồn tại`);
    if (notif.status !== 'ThatBai')
      throw new BadRequestException(`Chỉ có thể gửi lại thông báo ở trạng thái ThatBai`);
    const before = { trangThai: notif.status };
    notif.status = 'ChuaGui';
    await this.notifRepo.save(notif);
    this.auditLogsService.log({
      entityType: 'ThongBao',
      entityId: String(id),
      entityLabel: notif.title,
      actionType: 'CapNhat',
      actionDetail: `Gửi lại thông báo #${id}`,
      before: JSON.stringify(before),
      after: JSON.stringify({ trangThai: 'ChuaGui' }),
    });
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async resolveCustomerIds(dto: BroadcastNotificationDto): Promise<number[]> {
    if (dto.targetType === 'specific') {
      return dto.khachHangIds ?? [];
    }

    if (dto.targetType === 'all') {
      const cs = await this.customerRepo.find({ select: ['id'] });
      return cs.map((c) => c.id);
    }

    // targetType === 'group'
    const qb = this.customerRepo.createQueryBuilder('kh').select('kh.id', 'id');

    if (dto.groupFilter?.status) {
      const dbStatus = STATUS_ALIAS_MAP[dto.groupFilter.status] ?? dto.groupFilter.status;
      qb.andWhere('kh.trangThai = :status', { status: dbStatus });
    }

    if (dto.groupFilter?.tier) {
      const tier = await this.tierRepo.findOne({
        where: { name: dto.groupFilter.tier, isActive: true },
      });
      if (tier) {
        if (tier.maxPoints === null) {
          qb.andWhere('kh.diemHienTai >= :lo', { lo: tier.minPoints });
        } else {
          qb.andWhere('kh.diemHienTai BETWEEN :lo AND :hi', {
            lo: tier.minPoints,
            hi: tier.maxPoints,
          });
        }
      }
    }

    const results = await qb.getRawMany<{ id: number }>();
    return results.map((r) => Number(r.id));
  }

  private mapRow(
    n: Notification & { customer: Customer },
    maDonHang: string | null = null,
    maGiaoDichNgoai: string | null = null,
  ): NotificationAdminRow {
    return {
      thongBaoId:       n.id,
      khachHangId:      n.customerId,
      tenKhachHang:     n.customer.hoTen,
      emailKhachHang:   n.customer.email,
      loaiThongBao:     n.type,
      tieuDe:           n.title,
      noiDung:          n.content,
      kenhGui:          n.channel,
      trangThai:        n.status,
      daDoc:            n.isRead,
      entityLienQuan:   n.relatedEntity,
      entityLienQuanId: n.relatedEntityId,
      maDonHang,
      maGiaoDichNgoai,
      ngayTao:          n.createdAt.toISOString(),
    };
  }
}
