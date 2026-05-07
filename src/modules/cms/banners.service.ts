import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from './entities/banner.entity';
import { BannerResponseDto, mapBanner } from './dto/banner-response.dto';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { QueryBannersDto } from './dto/query-banners.dto';
import { UpdateBannersLayoutDto } from './dto/update-banners-layout.dto';
import { ReorderBannersDto } from './dto/reorder-banners.dto';

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(Banner)
    private readonly repo: Repository<Banner>,
  ) {}

  async findAll(query: QueryBannersDto) {
    const { page = 1, limit = 20, q, position, status } = query;
    const qb = this.repo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.createdBy', 'createdBy')
      .orderBy('b.sortOrder', 'ASC');

    if (q) qb.andWhere('b.title LIKE :q', { q: `%${q}%` });
    if (position?.length) qb.andWhere('b.position IN (:...position)', { position });
    if (status?.length) qb.andWhere('b.status IN (:...status)', { status });

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: items.map(mapBanner),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findPublic(position: string) {
    const now = new Date();
    return this.repo
      .createQueryBuilder('b')
      .where('b.position = :position', { position })
      .andWhere('b.status = :status', { status: 'active' })
      .andWhere('(b.startDate IS NULL OR b.startDate <= :now)', { now })
      .andWhere('(b.endDate IS NULL OR b.endDate >= :now)', { now })
      .orderBy('b.sortOrder', 'ASC')
      .getMany();
  }

  async findOne(id: number): Promise<BannerResponseDto> {
    return mapBanner(await this.loadOne(id));
  }

  private static readonly POSITION_LIMITS: Partial<Record<string, { max: number; label: string }>> = {
    homepage_hero:  { max: 1, label: 'Hero trang chủ' },
    homepage_small: { max: 4, label: '4 banner nhỏ' },
    side_banner:    { max: 2, label: 'Side Banner' },
  };

  async create(dto: CreateBannerDto, createdById: number): Promise<BannerResponseDto> {
    const limit = BannersService.POSITION_LIMITS[dto.position];
    if (limit) {
      const count = await this.repo.countBy({ position: dto.position });
      if (count >= limit.max) {
        throw new BadRequestException(
          `Vị trí "${limit.label}" chỉ cho phép tối đa ${limit.max} banner (hiện có ${count})`,
        );
      }
    }
    const banner = this.repo.create({ ...dto, createdById, updatedById: createdById });
    const saved = await this.repo.save(banner);
    return mapBanner(await this.loadOne(saved.id));
  }

  async update(id: number, dto: UpdateBannerDto, updatedById: number): Promise<BannerResponseDto> {
    await this.loadOne(id);
    await this.repo.update(id, { ...dto, updatedById });
    return mapBanner(await this.loadOne(id));
  }

  async remove(id: number): Promise<void> {
    await this.loadOne(id);
    await this.repo.delete(id);
  }

  async reorder(dto: ReorderBannersDto): Promise<void> {
    await Promise.all(
      dto.ids.map((id, idx) =>
        this.repo.update(Number(id), { sortOrder: idx + 1 }),
      ),
    );
  }

  async updateLayout(dto: UpdateBannersLayoutDto): Promise<void> {
    await Promise.all(
      dto.items.map(({ id, gridX, gridY, gridW, gridH }) =>
        this.repo.update(Number(id), { gridX, gridY, gridW, gridH }),
      ),
    );
  }

  private async loadOne(id: number): Promise<Banner> {
    const banner = await this.repo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.createdBy', 'createdBy')
      .where('b.id = :id', { id })
      .getOne();
    if (!banner) throw new NotFoundException('Banner không tồn tại');
    return banner;
  }
}
