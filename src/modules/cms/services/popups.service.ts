import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Popup, PopupStatus } from '../entities/popup.entity';
import { CreatePopupDto } from '../dto/create-popup.dto';
import { UpdatePopupDto } from '../dto/update-popup.dto';
import { PopupResponseDto } from '../dto/popup-response.dto';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';

@Injectable()
export class PopupsService {
  constructor(
    @InjectRepository(Popup)
    private readonly repo: Repository<Popup>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(): Promise<PopupResponseDto[]> {
    const popups = await this.repo.find({
      relations: ['createdByEmployee'],
      order: { createdAt: 'DESC' },
    });
    return popups.map(PopupResponseDto.fromEntity);
  }

  async findOne(id: number): Promise<PopupResponseDto> {
    const popup = await this.repo.findOne({
      where: { id },
      relations: ['createdByEmployee'],
    });
    if (!popup) throw new NotFoundException('Popup không tồn tại');
    return PopupResponseDto.fromEntity(popup);
  }

  async create(dto: CreatePopupDto, createdById: number): Promise<PopupResponseDto> {
    if (dto.status === PopupStatus.ACTIVE) await this.checkActiveConflict();
    if (dto.status === PopupStatus.SCHEDULED) {
      await this.checkScheduleOverlap(dto.startDate!, dto.endDate!);
    }
    const entity = this.repo.create({ ...dto, createdById });
    const saved = await this.repo.save(entity);
    const result = await this.findOne(saved.id);
    const popup = await this.repo.findOne({ where: { id: saved.id } });
    this.auditLogsService.log({
      entityType: 'Popup',
      entityId: String(saved.id),
      entityLabel: popup!.name ?? popup!.title ?? `Popup #${saved.id}`,
      actionType: 'TaoMoi',
      actionDetail: `Tạo popup "${popup!.name ?? popup!.title}" (trạng thái: ${popup!.status}, vị trí: ${popup!.position})`,
      after: JSON.stringify({ id: popup!.id, name: popup!.name, title: popup!.title, status: popup!.status, position: popup!.position, startDate: popup!.startDate, endDate: popup!.endDate }),
    });
    return result;
  }

  async update(id: number, dto: UpdatePopupDto): Promise<PopupResponseDto> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Popup không tồn tại');
    if (dto.status === PopupStatus.ACTIVE) await this.checkActiveConflict(id);
    if (dto.status === PopupStatus.SCHEDULED) {
      const start = dto.startDate ?? existing.startDate?.toISOString();
      const end = dto.endDate ?? existing.endDate?.toISOString();
      await this.checkScheduleOverlap(start!, end!, id);
    }
    await this.repo.update(id, dto);
    const updated = await this.repo.findOne({ where: { id } });
    this.auditLogsService.log({
      entityType: 'Popup',
      entityId: String(id),
      entityLabel: updated!.name ?? updated!.title ?? `Popup #${id}`,
      actionType: 'CapNhat',
      actionDetail: `Cập nhật popup "${updated!.name ?? updated!.title}"`,
      before: JSON.stringify({ name: existing.name, title: existing.title, status: existing.status, position: existing.position, startDate: existing.startDate, endDate: existing.endDate }),
      after: JSON.stringify({ name: updated!.name, title: updated!.title, status: updated!.status, position: updated!.position, startDate: updated!.startDate, endDate: updated!.endDate }),
    });
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Popup không tồn tại');
    await this.repo.delete(id);
    this.auditLogsService.log({
      entityType: 'Popup',
      entityId: String(id),
      entityLabel: existing.name ?? existing.title ?? `Popup #${id}`,
      actionType: 'Xoa',
      actionDetail: `Xóa popup "${existing.name ?? existing.title}" (trạng thái: ${existing.status})`,
      before: JSON.stringify({ id: existing.id, name: existing.name, title: existing.title, status: existing.status }),
    });
  }

  async findActive(): Promise<PopupResponseDto[]> {
    const now = new Date();
    const popups = await this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.createdByEmployee', 'emp')
      .where('p.status = :status', { status: PopupStatus.ACTIVE })
      .andWhere('(p.startDate IS NULL OR p.startDate <= :now)', { now })
      .andWhere('(p.endDate IS NULL OR p.endDate >= :now)', { now })
      .getMany();
    return popups.map(PopupResponseDto.fromEntity);
  }

  private async checkActiveConflict(excludeId?: number): Promise<void> {
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.status = :status', { status: PopupStatus.ACTIVE });
    if (excludeId) qb.andWhere('p.id != :id', { id: excludeId });
    const count = await qb.getCount();
    if (count > 0) {
      throw new ConflictException('Đã có popup đang hoạt động. Chỉ được 1 popup active tại 1 thời điểm.');
    }
  }

  private async checkScheduleOverlap(
    startDate: string,
    endDate: string,
    excludeId?: number,
  ): Promise<void> {
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.status = :status', { status: PopupStatus.SCHEDULED })
      .andWhere('p.startDate < :endDate', { endDate: new Date(endDate) })
      .andWhere('p.endDate > :startDate', { startDate: new Date(startDate) });
    if (excludeId) qb.andWhere('p.id != :id', { id: excludeId });
    const count = await qb.getCount();
    if (count > 0) {
      throw new ConflictException('Khoảng thời gian lên lịch bị trùng với popup khác.');
    }
  }
}
