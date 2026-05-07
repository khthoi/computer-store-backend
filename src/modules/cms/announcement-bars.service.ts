import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnnouncementBar, BarStatus, BarPosition } from './entities/announcement-bar.entity';
import { CreateAnnouncementBarDto } from './dto/create-announcement-bar.dto';
import { UpdateAnnouncementBarDto } from './dto/update-announcement-bar.dto';
import { AnnouncementBarResponseDto } from './dto/announcement-bar-response.dto';

@Injectable()
export class AnnouncementBarsService {
  constructor(
    @InjectRepository(AnnouncementBar)
    private readonly repo: Repository<AnnouncementBar>,
  ) {}

  async findAll(): Promise<AnnouncementBarResponseDto[]> {
    const bars = await this.repo.find({
      relations: ['createdByEmployee'],
      order: { createdAt: 'DESC' },
    });
    return bars.map(AnnouncementBarResponseDto.fromEntity);
  }

  async findOne(id: number): Promise<AnnouncementBarResponseDto> {
    const bar = await this.repo.findOne({
      where: { id },
      relations: ['createdByEmployee'],
    });
    if (!bar) throw new NotFoundException('Thanh thông báo không tồn tại');
    return AnnouncementBarResponseDto.fromEntity(bar);
  }

  async create(dto: CreateAnnouncementBarDto, createdById: number): Promise<AnnouncementBarResponseDto> {
    const position = dto.position ?? BarPosition.TOP;
    if (dto.status === BarStatus.ACTIVE) await this.checkActiveConflict(position);
    if (dto.status === BarStatus.SCHEDULED) {
      await this.checkScheduleOverlap(position, dto.startDate!, dto.endDate!);
    }
    const entity = this.repo.create({ ...dto, createdById });
    const saved = await this.repo.save(entity);
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateAnnouncementBarDto): Promise<AnnouncementBarResponseDto> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Thanh thông báo không tồn tại');
    const position = dto.position ?? existing.position;
    if (dto.status === BarStatus.ACTIVE) await this.checkActiveConflict(position, id);
    if (dto.status === BarStatus.SCHEDULED) {
      const start = dto.startDate ?? existing.startDate?.toISOString();
      const end = dto.endDate ?? existing.endDate?.toISOString();
      await this.checkScheduleOverlap(position, start!, end!, id);
    }
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Thanh thông báo không tồn tại');
    await this.repo.delete(id);
  }

  private async checkActiveConflict(position: BarPosition, excludeId?: number): Promise<void> {
    const qb = this.repo
      .createQueryBuilder('b')
      .where('b.status = :status', { status: BarStatus.ACTIVE })
      .andWhere('b.position = :position', { position });
    if (excludeId) qb.andWhere('b.id != :id', { id: excludeId });
    const count = await qb.getCount();
    if (count > 0) {
      throw new ConflictException(
        `Đã có thanh thông báo ${position} đang hoạt động. Chỉ được 1 active per vị trí.`,
      );
    }
  }

  private async checkScheduleOverlap(
    position: BarPosition,
    startDate: string,
    endDate: string,
    excludeId?: number,
  ): Promise<void> {
    const qb = this.repo
      .createQueryBuilder('b')
      .where('b.status = :status', { status: BarStatus.SCHEDULED })
      .andWhere('b.position = :position', { position })
      .andWhere('b.startDate < :endDate', { endDate: new Date(endDate) })
      .andWhere('b.endDate > :startDate', { startDate: new Date(startDate) });
    if (excludeId) qb.andWhere('b.id != :id', { id: excludeId });
    const count = await qb.getCount();
    if (count > 0) {
      throw new ConflictException('Khoảng thời gian lên lịch bị trùng với thanh thông báo khác cùng vị trí.');
    }
  }
}
