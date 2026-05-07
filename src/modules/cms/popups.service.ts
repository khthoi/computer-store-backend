import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Popup, PopupStatus } from './entities/popup.entity';
import { CreatePopupDto } from './dto/create-popup.dto';
import { UpdatePopupDto } from './dto/update-popup.dto';
import { PopupResponseDto } from './dto/popup-response.dto';

@Injectable()
export class PopupsService {
  constructor(
    @InjectRepository(Popup)
    private readonly repo: Repository<Popup>,
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
    return this.findOne(saved.id);
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
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Popup không tồn tại');
    await this.repo.delete(id);
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
