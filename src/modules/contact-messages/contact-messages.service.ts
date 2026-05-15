import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ContactMessage,
  ContactMessageStatus,
} from './entities/contact-message.entity';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { UpdateContactMessageDto } from './dto/update-contact-message.dto';
import { QueryContactMessagesDto } from './dto/query-contact-messages.dto';

const MAX_PER_SESSION = 2;
const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ContactMessagesService {
  constructor(
    @InjectRepository(ContactMessage)
    private readonly repo: Repository<ContactMessage>,
  ) {}

  private windowStart(): Date {
    return new Date(Date.now() - SESSION_WINDOW_MS);
  }

  async getQuota(ipAddress: string | null) {
    if (!ipAddress) {
      return { max: MAX_PER_SESSION, used: 0, remaining: MAX_PER_SESSION };
    }
    const used = await this.repo
      .createQueryBuilder('c')
      .where('c.dia_chi_ip = :ip', { ip: ipAddress })
      .andWhere('c.ngay_tao >= :since', { since: this.windowStart() })
      .getCount();
    const remaining = Math.max(0, MAX_PER_SESSION - used);
    return { max: MAX_PER_SESSION, used, remaining };
  }

  async submit(
    dto: CreateContactMessageDto,
    ipAddress: string | null,
    userAgent: string | null,
  ) {
    const quota = await this.getQuota(ipAddress);
    if (quota.remaining <= 0) {
      throw new ForbiddenException(
        `Bạn đã đạt giới hạn ${MAX_PER_SESSION} lần gửi trong phiên này. Vui lòng thử lại sau.`,
      );
    }
    const entity = this.repo.create({
      fullName: dto.fullName.trim(),
      email: dto.email.trim().toLowerCase(),
      phone: dto.phone?.trim() || null,
      subject: dto.subject.trim(),
      message: dto.message.trim(),
      ipAddress,
      userAgent: userAgent?.slice(0, 500) ?? null,
      status: ContactMessageStatus.NEW,
    });
    await this.repo.save(entity);
    const after = await this.getQuota(ipAddress);
    return { id: entity.id, quota: after };
  }

  async adminList(query: QueryContactMessagesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.repo
      .createQueryBuilder('c')
      .orderBy('c.ngay_tao', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) {
      qb.andWhere('c.trang_thai = :status', { status: query.status });
    }
    if (query.search) {
      qb.andWhere(
        '(c.ho_ten LIKE :q OR c.email LIKE :q OR c.noi_dung LIKE :q)',
        { q: `%${query.search}%` },
      );
    }

    const [items, total] = await qb.getManyAndCount();
    return {
      data: items.map((it) => this.toListItem(it)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async adminGet(id: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy liên hệ');
    return this.toDetail(item);
  }

  async adminUpdate(id: number, dto: UpdateContactMessageDto, employeeId?: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy liên hệ');

    if (dto.status !== undefined) {
      item.status = dto.status;
      if (dto.status === ContactMessageStatus.RESOLVED) {
        item.resolvedAt = new Date();
        item.resolvedById = employeeId ?? item.resolvedById;
      } else {
        item.resolvedAt = null;
        item.resolvedById = null;
      }
    }
    if (dto.adminNote !== undefined) {
      item.adminNote = dto.adminNote;
    }
    await this.repo.save(item);
    return this.toDetail(item);
  }

  async adminDelete(id: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy liên hệ');
    await this.repo.remove(item);
  }

  async adminStats() {
    const [total, newCount] = await Promise.all([
      this.repo.count(),
      this.repo.count({ where: { status: ContactMessageStatus.NEW } }),
    ]);
    return {
      total,
      new: newCount,
      resolved: total - newCount,
    };
  }

  private toListItem(it: ContactMessage) {
    return {
      id: it.id,
      fullName: it.fullName,
      email: it.email,
      phone: it.phone,
      subject: it.subject,
      message: it.message,
      status: it.status,
      createdAt: it.createdAt,
      resolvedAt: it.resolvedAt,
    };
  }

  private toDetail(it: ContactMessage) {
    return {
      ...this.toListItem(it),
      ipAddress: it.ipAddress,
      userAgent: it.userAgent,
      adminNote: it.adminNote,
      resolvedById: it.resolvedById,
    };
  }
}
