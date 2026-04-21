import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion, PromotionStatus } from './entities/promotion.entity';
import { PromotionUsage } from './entities/promotion-usage.entity';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { QueryPromotionDto } from './dto/query-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepo: Repository<Promotion>,
    @InjectRepository(PromotionUsage)
    private readonly usageRepo: Repository<PromotionUsage>,
  ) {}

  async create(dto: CreatePromotionDto, createdBy: number): Promise<Promotion> {
    if (dto.isCoupon && dto.code) {
      const exists = await this.promotionRepo.findOne({ where: { code: dto.code } });
      if (exists) throw new ConflictException('Coupon code đã tồn tại');
    }
    const promotion = this.promotionRepo.create({
      ...dto,
      createdBy,
      status: dto.status ?? PromotionStatus.DRAFT,
    });
    return this.promotionRepo.save(promotion);
  }

  async findAll(query: QueryPromotionDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.promotionRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.scopes', 'scopes')
      .leftJoinAndSelect('p.conditions', 'conditions')
      .leftJoinAndSelect('p.actions', 'actions')
      .orderBy('p.priority', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) qb.andWhere('p.status = :status', { status: query.status });
    if (query.type) qb.andWhere('p.type = :type', { type: query.type });
    if (query.search) qb.andWhere('p.name LIKE :search', { search: `%${query.search}%` });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<Promotion> {
    const promotion = await this.promotionRepo.findOne({
      where: { id },
      relations: ['scopes', 'conditions', 'actions', 'actions.bulkTiers', 'actions.bulkComponents'],
    });
    if (!promotion) throw new NotFoundException(`Promotion #${id} không tồn tại`);
    return promotion;
  }

  async findActivePromotions(): Promise<Promotion[]> {
    const now = new Date();
    return this.promotionRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.scopes', 'scopes')
      .leftJoinAndSelect('p.conditions', 'conditions')
      .leftJoinAndSelect('p.actions', 'actions')
      .leftJoinAndSelect('actions.bulkTiers', 'bulkTiers')
      .leftJoinAndSelect('actions.bulkComponents', 'bulkComponents')
      .where('p.status = :status', { status: PromotionStatus.ACTIVE })
      .andWhere('p.start_date <= :now', { now })
      .andWhere('p.end_date >= :now', { now })
      .orderBy('p.priority', 'DESC')
      .getMany();
  }

  async findByCouponCode(code: string): Promise<Promotion | null> {
    const now = new Date();
    return this.promotionRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.scopes', 'scopes')
      .leftJoinAndSelect('p.conditions', 'conditions')
      .leftJoinAndSelect('p.actions', 'actions')
      .leftJoinAndSelect('actions.bulkTiers', 'bulkTiers')
      .leftJoinAndSelect('actions.bulkComponents', 'bulkComponents')
      .where('p.code = :code', { code })
      .andWhere('p.status = :status', { status: PromotionStatus.ACTIVE })
      .andWhere('p.start_date <= :now', { now })
      .andWhere('p.end_date >= :now', { now })
      .getOne();
  }

  async update(id: number, dto: UpdatePromotionDto): Promise<Promotion> {
    const promotion = await this.findOne(id);
    Object.assign(promotion, dto);
    return this.promotionRepo.save(promotion);
  }

  async cancel(id: number): Promise<void> {
    await this.findOne(id);
    await this.promotionRepo.update(id, { status: PromotionStatus.CANCELLED });
  }

  async countCustomerUsage(promotionId: number, customerId: number): Promise<number> {
    return this.usageRepo.count({ where: { promotionId, customerId } });
  }

  async recordUsage(
    promotionId: number,
    customerId: number,
    orderId: number,
    discountAmount: number,
  ): Promise<void> {
    await this.usageRepo.save({ promotionId, customerId, orderId, discountAmount });
    await this.promotionRepo.increment({ id: promotionId }, 'usageCount', 1);
  }
}
