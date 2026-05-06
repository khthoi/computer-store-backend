import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../../common/redis/redis.service';
import { Promotion, PromotionStatus } from './entities/promotion.entity';
import { PromotionScope } from './entities/promotion-scope.entity';
import { PromotionCondition } from './entities/promotion-condition.entity';
import { PromotionAction } from './entities/promotion-action.entity';
import { BulkTier } from './entities/bulk-tier.entity';
import { BulkComponent } from './entities/bulk-component.entity';
import { PromotionUsage } from './entities/promotion-usage.entity';
import { LoyaltyRedemption } from '../loyalty/entities/loyalty-redemption.entity';
import { RedemptionCatalog } from '../loyalty/entities/redemption-catalog.entity';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { QueryPromotionDto } from './dto/query-promotion.dto';
import {
  PromotionResponseDto,
  PromotionSummaryResponseDto,
  PromotionUsageResponseDto,
  PromotionUsageStatsResponseDto,
  PromotionActionResponseDto,
} from './dto/promotion-response.dto';

const FULL_RELATIONS = ['scopes', 'conditions', 'actions', 'actions.bulkTiers', 'actions.bulkComponents'];

@Injectable()
export class PromotionsService {
  private readonly CODE_GEN_COOLDOWN_S = 10;
  private readonly CODE_GEN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  constructor(
    @InjectRepository(Promotion) private readonly promotionRepo: Repository<Promotion>,
    @InjectRepository(PromotionScope) private readonly scopeRepo: Repository<PromotionScope>,
    @InjectRepository(PromotionCondition) private readonly conditionRepo: Repository<PromotionCondition>,
    @InjectRepository(PromotionAction) private readonly actionRepo: Repository<PromotionAction>,
    @InjectRepository(PromotionUsage) private readonly usageRepo: Repository<PromotionUsage>,
    @InjectRepository(LoyaltyRedemption) private readonly redemptionRepo: Repository<LoyaltyRedemption>,
    @InjectRepository(RedemptionCatalog) private readonly redemptionCatalogRepo: Repository<RedemptionCatalog>,
    private readonly redisService: RedisService,
  ) {}

  async create(dto: CreatePromotionDto, createdBy: number): Promise<PromotionResponseDto> {
    if (dto.isCoupon && dto.code) {
      const exists = await this.promotionRepo.findOne({ where: { code: dto.code } });
      if (exists) throw new ConflictException('Coupon code đã tồn tại');
    }
    const promotion = this.promotionRepo.create({ ...dto, createdBy, status: dto.status ?? PromotionStatus.DRAFT });
    const saved = await this.promotionRepo.save(promotion);
    return this.findOne(saved.id);
  }

  async findAll(query: QueryPromotionDto): Promise<{ data: PromotionSummaryResponseDto[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const isCoupon = this.normalizeBooleanQuery(query.isCoupon);
    const allowedSortBy: Record<string, string> = {
      name: 'p.name', type: 'p.type', status: 'p.status',
      priority: 'p.priority', startDate: 'p.startDate', endDate: 'p.endDate',
      usageCount: 'p.usageCount', createdAt: 'p.createdAt',
      discountDisplay: 'p.priority',
    };
    const orderCol = allowedSortBy[query.sortBy ?? ''] ?? 'p.priority';
    const orderDir = (query.sortOrder?.toUpperCase() ?? 'DESC') as 'ASC' | 'DESC';

    const qb = this.promotionRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.scopes', 'scopes')
      .leftJoinAndSelect('p.actions', 'actions')
      .orderBy(orderCol, orderDir)
      .skip((page - 1) * limit)
      .take(limit);
    if (query.status) qb.andWhere('p.status = :status', { status: query.status });
    if (query.type) qb.andWhere('p.type = :type', { type: query.type });
    if (query.search) qb.andWhere('p.name LIKE :search', { search: `%${query.search}%` });
    if (isCoupon !== undefined) qb.andWhere('p.is_coupon = :isCoupon', { isCoupon: isCoupon ? 1 : 0 });
    const [data, total] = await qb.getManyAndCount();
    return { data: data.map((p) => this.toSummaryDto(p)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private normalizeBooleanQuery(value: unknown): boolean | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
    if (value === false || value === 'false' || value === 0 || value === '0') return false;
    return undefined;
  }

  async findOne(id: number): Promise<PromotionResponseDto> {
    const promotion = await this.findOneRaw(id);
    return this.toDto(promotion);
  }

  async findOneRaw(id: number): Promise<Promotion> {
    const promotion = await this.promotionRepo.findOne({ where: { id }, relations: FULL_RELATIONS });
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
      .andWhere('p.start_date <= :now AND p.end_date >= :now', { now })
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
      .where('p.code = :code AND p.status = :status', { code, status: PromotionStatus.ACTIVE })
      .andWhere('p.start_date <= :now AND p.end_date >= :now', { now })
      .getOne();
  }

  async update(id: number, dto: UpdatePromotionDto): Promise<PromotionResponseDto> {
    const promotion = await this.findOneRaw(id);
    const { scopes, conditions, actions, ...scalar } = dto as any;
    Object.assign(promotion, scalar);
    await this.promotionRepo.save(promotion);

    if (scopes !== undefined) {
      await this.scopeRepo.delete({ promotionId: id });
      if (scopes.length) await this.scopeRepo.save(scopes.map((s: any) => ({ ...s, promotionId: id })));
    }
    if (conditions !== undefined) {
      await this.conditionRepo.delete({ promotionId: id });
      if (conditions.length) await this.conditionRepo.save(conditions.map((c: any) => ({ ...c, promotionId: id })));
    }
    if (actions !== undefined) {
      const oldActions = await this.actionRepo.find({ where: { promotionId: id } });
      await this.actionRepo.remove(oldActions);
      if (actions.length) {
        const saved = await this.actionRepo.save(actions.map((a: any) => {
          const { bulkTiers, bulkComponents, ...rest } = a;
          return { ...rest, promotionId: id };
        }));
        for (let i = 0; i < actions.length; i++) {
          const { bulkTiers, bulkComponents } = actions[i];
          if (bulkTiers?.length) await this.usageRepo.manager.getRepository(BulkTier).save(bulkTiers.map((t: any) => ({ ...t, actionId: saved[i].id })));
          if (bulkComponents?.length) await this.usageRepo.manager.getRepository(BulkComponent).save(bulkComponents.map((c: any) => ({ ...c, actionId: saved[i].id })));
        }
      }
    }
    return this.findOne(id);
  }

  async setStatus(id: number, status: PromotionStatus): Promise<PromotionResponseDto> {
    await this.findOneRaw(id);
    await this.promotionRepo.update(id, { status });
    return this.findOne(id);
  }

  async cancel(id: number): Promise<void> {
    await this.findOneRaw(id);
    await this.promotionRepo.update(id, { status: PromotionStatus.CANCELLED });
  }

  async remove(id: number): Promise<void> {
    const promotion = await this.findOneRaw(id);
    await this.redemptionRepo.delete({ promotionId: id });
    await this.redemptionCatalogRepo.delete({ promotionId: id });
    await this.usageRepo.delete({ promotionId: id });
    await this.scopeRepo.delete({ promotionId: id });
    await this.conditionRepo.delete({ promotionId: id });
    const actions = await this.actionRepo.find({ where: { promotionId: id } });
    if (actions.length) await this.actionRepo.remove(actions);
    await this.promotionRepo.remove(promotion);
  }

  private async buildUniqueCopyCode(baseCode: string): Promise<string> {
    const candidates = [
      `${baseCode}-COPY`,
      ...Array.from({ length: 9 }, (_, i) => `${baseCode}-COPY-${i + 2}`),
    ];
    for (const candidate of candidates) {
      const exists = await this.promotionRepo.findOne({ where: { code: candidate } });
      if (!exists) return candidate;
    }
    return await this.buildRandomCode();
  }

  private async buildRandomCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = Array.from(
        { length: 8 },
        () => this.CODE_GEN_CHARS.charAt(Math.floor(Math.random() * this.CODE_GEN_CHARS.length)),
      ).join('');
      const exists = await this.promotionRepo.findOne({ where: { code } });
      if (!exists) return code;
    }
    throw new ConflictException('Không thể tạo mã giảm giá duy nhất, vui lòng thử lại');
  }

  async generateCode(userId: number): Promise<{ code: string; cooldownMs: number }> {
    const key = `coupon_code_gen:${userId}`;
    const ttlMs = await this.redisService.getTtlMs(key);
    if (ttlMs > 0) throw new ConflictException(`Vui lòng đợi trước khi tạo mã mới`);
    const code = await this.buildRandomCode();
    await this.redisService.set(key, '1', this.CODE_GEN_COOLDOWN_S);
    return { code, cooldownMs: this.CODE_GEN_COOLDOWN_S * 1000 };
  }

  async getCodeGenCooldownMs(userId: number): Promise<{ remainingMs: number }> {
    const key = `coupon_code_gen:${userId}`;
    const remainingMs = await this.redisService.getTtlMs(key);
    return { remainingMs };
  }

  async duplicate(id: number): Promise<PromotionResponseDto> {
    const original = await this.findOneRaw(id);
    let copyCode: string | null = null;
    if (original.isCoupon && original.code) {
      copyCode = await this.buildUniqueCopyCode(original.code);
    }
    const copy = this.promotionRepo.create({
      name: `${original.name} (Copy)`,
      description: original.description,
      type: original.type,
      isCoupon: original.isCoupon,
      code: copyCode,
      status: PromotionStatus.DRAFT,
      priority: original.priority,
      stackingPolicy: original.stackingPolicy,
      startDate: original.startDate,
      endDate: original.endDate,
      totalUsageLimit: original.totalUsageLimit,
      perCustomerLimit: original.perCustomerLimit,
      usageCount: 0,
      createdBy: original.createdBy,
    });
    const saved = await this.promotionRepo.save(copy);
    if (original.scopes?.length) await this.scopeRepo.save(original.scopes.map(({ id: _, promotionId: __, ...rest }) => ({ ...rest, promotionId: saved.id })));
    if (original.conditions?.length) await this.conditionRepo.save(original.conditions.map(({ id: _, promotionId: __, ...rest }) => ({ ...rest, promotionId: saved.id })));
    if (original.actions?.length) {
      for (const a of original.actions) {
        const { id: _, promotionId: __, bulkTiers, bulkComponents, ...aRest } = a as any;
        const newAction = await this.actionRepo.save({ ...aRest, promotionId: saved.id });
        if (bulkTiers?.length) await this.usageRepo.manager.getRepository(BulkTier).save(bulkTiers.map(({ id: _t, actionId: __, ...t }: any) => ({ ...t, actionId: newAction.id })));
        if (bulkComponents?.length) await this.usageRepo.manager.getRepository(BulkComponent).save(bulkComponents.map(({ id: _c, actionId: __, ...c }: any) => ({ ...c, actionId: newAction.id })));
      }
    }
    return this.findOne(saved.id);
  }

  async findUsages(id: number): Promise<PromotionUsageResponseDto[]> {
    const usages = await this.usageRepo.find({
      where: { promotionId: id },
      relations: ['customer'],
      order: { appliedAt: 'DESC' },
    });
    return usages.map((u) => ({
      id: String(u.id),
      promotionId: String(u.promotionId),
      customerId: String(u.customerId),
      customerName: u.customer?.hoTen ?? '',
      orderId: String(u.orderId),
      discountAmount: Number(u.discountAmount),
      appliedAt: u.appliedAt.toISOString(),
    }));
  }

  async findUsageStats(id: number): Promise<PromotionUsageStatsResponseDto> {
    const usages = await this.usageRepo.find({ where: { promotionId: id } });
    return {
      totalUses: usages.length,
      totalDiscount: usages.reduce((s, u) => s + Number(u.discountAmount), 0),
      uniqueCustomers: new Set(usages.map((u) => u.customerId)).size,
    };
  }

  async countCustomerUsage(promotionId: number, customerId: number): Promise<number> {
    return this.usageRepo.count({ where: { promotionId, customerId } });
  }

  async recordUsage(promotionId: number, customerId: number, orderId: number, discountAmount: number): Promise<void> {
    await this.usageRepo.save({ promotionId, customerId, orderId, discountAmount });
    await this.promotionRepo.increment({ id: promotionId }, 'usageCount', 1);
  }

  private toActionDto(a: PromotionAction): PromotionActionResponseDto {
    const dto: PromotionActionResponseDto = {
      id: String(a.id),
      promotionId: String(a.promotionId),
      actionType: a.actionType,
      applicationLevel: a.applicationLevel,
      discountType: a.discountType ?? undefined,
      discountValue: a.discountValue != null ? Number(a.discountValue) : undefined,
      maxDiscountAmount: a.maxDiscountAmount != null ? Number(a.maxDiscountAmount) : undefined,
    };
    if (a.bxgyBuyQty != null) {
      dto.bxgy = {
        buyQuantity: a.bxgyBuyQty,
        buyProductId: a.bxgyBuyProductId ?? undefined,
        getQuantity: a.bxgyGetQty ?? 1,
        getProductId: a.bxgyGetProductId ?? undefined,
        getDiscountPercent: a.bxgyGetDiscountPct ?? 100,
        deliveryMode: a.bxgyDeliveryMode ?? 'auto_add',
        maxApplicationsPerOrder: a.bxgyMaxApplications ?? 1,
        eligibleFreeProductIds: a.bxgyEligibleProductIds ? JSON.parse(a.bxgyEligibleProductIds) : undefined,
      };
    }
    if (a.bulkTiers?.length) {
      dto.tiers = a.bulkTiers.map((t) => ({ minQuantity: t.minQuantity, maxQuantity: t.maxQuantity ?? undefined, discountValue: Number(t.discountValue), discountType: t.discountType }));
    }
    if (a.bulkComponents?.length) {
      dto.requiredComponents = a.bulkComponents.map((c) => ({ id: String(c.id), scope: c.scope, refId: c.refId, refLabel: c.refLabel ?? undefined, minQuantity: c.minQuantity }));
    }
    return dto;
  }

  private toDto(p: Promotion): PromotionResponseDto {
    return {
      id: String(p.id),
      name: p.name,
      description: p.description ?? undefined,
      type: p.type,
      isCoupon: p.isCoupon,
      code: p.code ?? undefined,
      status: p.status,
      priority: p.priority,
      stackingPolicy: p.stackingPolicy,
      startDate: p.startDate.toISOString(),
      endDate: p.endDate.toISOString(),
      totalUsageLimit: p.totalUsageLimit ?? undefined,
      perCustomerLimit: p.perCustomerLimit ?? undefined,
      usageCount: p.usageCount,
      scopes: (p.scopes ?? []).map((s) => ({ id: String(s.id), promotionId: String(s.promotionId), scopeType: s.scopeType, scopeRefId: s.scopeRefId ?? undefined, scopeRefLabel: s.scopeRefLabel ?? undefined })),
      conditions: (p.conditions ?? []).map((c) => ({ id: String(c.id), promotionId: String(c.promotionId), type: c.type, operator: c.operator, value: c.value })),
      actions: (p.actions ?? []).map((a) => this.toActionDto(a)),
      createdBy: String(p.createdBy),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  private toSummaryDto(p: Promotion): PromotionSummaryResponseDto {
    const scopes = p.scopes ?? [];
    const scopeDisplay = !scopes.length || scopes.some((s) => s.scopeType === 'global')
      ? 'Global'
      : scopes.length === 1 ? (scopes[0].scopeRefLabel ?? scopes[0].scopeRefId ?? 'Custom') : `${scopes.length} scopes`;
    const actions = p.actions ?? [];
    let discountDisplay = '—';
    if (p.type === 'bxgy') discountDisplay = 'Buy X Get Y';
    else if (p.type === 'bundle') discountDisplay = 'Bundle Deal';
    else if (p.type === 'bulk') discountDisplay = 'Bulk Tiered';
    else if (p.type === 'free_shipping') discountDisplay = 'Free Shipping';
    else if (actions[0]?.discountType === 'percentage') discountDisplay = `${actions[0].discountValue}% off`;
    else if (actions[0]?.discountType === 'fixed') {
      const v = Number(actions[0].discountValue ?? 0);
      discountDisplay = v >= 1_000_000 ? `₫${(v / 1_000_000).toFixed(1)}M off` : `₫${(v / 1_000).toFixed(0)}k off`;
    }
    return {
      id: String(p.id), name: p.name, type: p.type, isCoupon: p.isCoupon, code: p.code ?? undefined,
      status: p.status, priority: p.priority, stackingPolicy: p.stackingPolicy,
      startDate: p.startDate.toISOString(), endDate: p.endDate.toISOString(),
      totalUsageLimit: p.totalUsageLimit ?? undefined, perCustomerLimit: p.perCustomerLimit ?? undefined,
      usageCount: p.usageCount, scopeDisplay, discountDisplay,
      createdBy: String(p.createdBy), createdAt: p.createdAt.toISOString(),
    };
  }
}
