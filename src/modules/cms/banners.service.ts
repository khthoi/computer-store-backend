import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from './entities/banner.entity';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { QueryBannersDto } from './dto/query-banners.dto';

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(Banner)
    private readonly repo: Repository<Banner>,
  ) {}

  async findAll(query: QueryBannersDto) {
    const { page = 1, limit = 20, position, status } = query;
    const qb = this.repo.createQueryBuilder('b').orderBy('b.sort_order', 'ASC');
    if (position) qb.andWhere('b.vi_tri_hien_thi = :position', { position });
    if (status) qb.andWhere('b.trang_thai = :status', { status });
    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findPublic(position: string) {
    const now = new Date();
    return this.repo
      .createQueryBuilder('b')
      .where('b.vi_tri_hien_thi = :position', { position })
      .andWhere('b.trang_thai = :status', { status: 'DangHienThi' })
      .andWhere('(b.ngay_bat_dau IS NULL OR b.ngay_bat_dau <= :now)', { now })
      .andWhere('(b.ngay_ket_thuc IS NULL OR b.ngay_ket_thuc >= :now)', { now })
      .orderBy('b.thu_tu_hien_thi', 'ASC')
      .getMany();
  }

  async findOne(id: number) {
    const banner = await this.repo.findOne({ where: { id } });
    if (!banner) throw new NotFoundException('Banner không tồn tại');
    return banner;
  }

  async create(dto: CreateBannerDto, createdById: number) {
    const banner = this.repo.create({ ...dto, createdById, updatedById: createdById });
    return this.repo.save(banner);
  }

  async update(id: number, dto: UpdateBannerDto, updatedById: number) {
    await this.findOne(id);
    await this.repo.update(id, { ...dto, updatedById });
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.repo.delete(id);
  }
}
