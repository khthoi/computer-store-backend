import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Popup } from './entities/popup.entity';
import { CreatePopupDto } from './dto/create-popup.dto';
import { UpdatePopupDto } from './dto/update-popup.dto';

@Injectable()
export class PopupsService {
  constructor(
    @InjectRepository(Popup)
    private readonly repo: Repository<Popup>,
  ) {}

  async findActive() {
    const now = new Date();
    return this.repo
      .createQueryBuilder('p')
      .where('p.trang_thai = :status', { status: 'hoat_dong' })
      .andWhere('(p.ngay_bat_dau IS NULL OR p.ngay_bat_dau <= :now)', { now })
      .andWhere('(p.ngay_ket_thuc IS NULL OR p.ngay_ket_thuc >= :now)', { now })
      .orderBy('p.thu_tu', 'ASC')
      .getMany();
  }

  async findAll() {
    return this.repo.find({ order: { sortOrder: 'ASC' } });
  }

  async findOne(id: number) {
    const popup = await this.repo.findOne({ where: { id } });
    if (!popup) throw new NotFoundException('Popup không tồn tại');
    return popup;
  }

  async create(dto: CreatePopupDto, createdById: number) {
    return this.repo.save(this.repo.create({ ...dto, createdById }));
  }

  async update(id: number, dto: UpdatePopupDto) {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.repo.delete(id);
  }
}
