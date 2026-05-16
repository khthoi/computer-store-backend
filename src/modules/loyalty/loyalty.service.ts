import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { LoyaltyEarnRule } from './entities/loyalty-earn-rule.entity';
import { LoyaltyEarnRuleScope } from './entities/loyalty-earn-rule-scope.entity';
import { LoyaltyTransaction } from './entities/loyalty-transaction.entity';
import { RedemptionCatalog } from './entities/redemption-catalog.entity';
import { LoyaltyRedemption } from './entities/loyalty-redemption.entity';
import { CreateEarnRuleDto } from './dto/create-earn-rule.dto';
import { RedeemPointsDto } from './dto/redeem-points.dto';
import { CreateRedemptionCatalogDto } from './dto/create-redemption-catalog.dto';
import { UpdateRedemptionCatalogDto } from './dto/update-redemption-catalog.dto';
import { AdjustPointsDto } from './dto/adjust-points.dto';
import {
  EarnRuleResponseDto,
  EarnRuleScopeResponseDto,
  LoyaltyTransactionResponseDto,
  LoyaltyRedemptionResponseDto,
  RedemptionCatalogResponseDto,
  MembershipTierResponseDto,
} from './dto/loyalty-response.dto';
import { MembershipTier } from './entities/membership-tier.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(LoyaltyEarnRule)
    private readonly earnRuleRepo: Repository<LoyaltyEarnRule>,
    @InjectRepository(LoyaltyEarnRuleScope)
    private readonly earnRuleScopeRepo: Repository<LoyaltyEarnRuleScope>,
    @InjectRepository(LoyaltyTransaction)
    private readonly transactionRepo: Repository<LoyaltyTransaction>,
    @InjectRepository(RedemptionCatalog)
    private readonly catalogRepo: Repository<RedemptionCatalog>,
    @InjectRepository(LoyaltyRedemption)
    private readonly redemptionRepo: Repository<LoyaltyRedemption>,
    @InjectRepository(MembershipTier)
    private readonly tierRepo: Repository<MembershipTier>,
    private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ─── Earn Rules ───────────────────────────────────────────────────────────

  async createEarnRule(dto: CreateEarnRuleDto, createdBy: number): Promise<EarnRuleResponseDto> {
    const rule = this.earnRuleRepo.create({ ...dto, createdBy });
    const saved = await this.earnRuleRepo.save(rule);
    this.auditLogsService.log({
      entityType: 'LoyaltyEarnRule',
      entityId: String(saved.id),
      entityLabel: saved.name,
      actionType: 'TaoMoi',
      actionDetail: `Tạo quy tắc tích điểm "${saved.name}"`,
      after: JSON.stringify({ name: saved.name, pointsPerUnit: saved.pointsPerUnit, spendPerUnit: Number(saved.spendPerUnit), isActive: saved.isActive }),
    });
    return this.toEarnRuleDto(saved);
  }

  async findAllEarnRules(page = 1, limit = 20, search?: string): Promise<{ data: EarnRuleResponseDto[]; total: number; totalPages: number }> {
    const qb = this.earnRuleRepo.createQueryBuilder('r')
      .leftJoinAndSelect('r.scopes', 'scopes')
      .orderBy('r.priority', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (search) {
      qb.where('(r.name LIKE :s OR r.description LIKE :s)', { s: `%${search}%` });
    }
    const [rules, total] = await qb.getManyAndCount();
    return { data: rules.map((r) => this.toEarnRuleDto(r)), total, totalPages: Math.ceil(total / limit) };
  }

  async findEarnRuleById(id: number): Promise<EarnRuleResponseDto> {
    const rule = await this.earnRuleRepo.findOne({ where: { id }, relations: ['scopes'] });
    if (!rule) throw new NotFoundException(`Earn rule #${id} không tồn tại`);
    return this.toEarnRuleDto(rule);
  }

  async findActiveEarnRules(): Promise<LoyaltyEarnRule[]> {
    const now = new Date();
    return this.earnRuleRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.scopes', 'scopes')
      .where('r.is_active = 1')
      .andWhere('(r.valid_from IS NULL OR r.valid_from <= :now)', { now })
      .andWhere('(r.valid_until IS NULL OR r.valid_until >= :now)', { now })
      .orderBy('r.priority', 'DESC')
      .getMany();
  }

  async updateEarnRule(id: number, dto: Partial<CreateEarnRuleDto>): Promise<EarnRuleResponseDto> {
    const rule = await this.earnRuleRepo.findOne({ where: { id }, relations: ['scopes'] });
    if (!rule) throw new NotFoundException(`Earn rule #${id} không tồn tại`);

    const beforeSnapshot = { name: rule.name, isActive: rule.isActive, pointsPerUnit: rule.pointsPerUnit, spendPerUnit: Number(rule.spendPerUnit) };
    const { scopes, ...rest } = dto;
    Object.assign(rule, rest);

    if (scopes !== undefined) {
      await this.earnRuleScopeRepo.delete({ earnRuleId: id });
      rule.scopes = scopes.map((s) =>
        this.earnRuleScopeRepo.create({ ...s, earnRuleId: id }),
      );
    }

    const saved = await this.earnRuleRepo.save(rule);
    this.auditLogsService.log({
      entityType: 'LoyaltyEarnRule',
      entityId: String(id),
      entityLabel: saved.name,
      actionType: 'CapNhat',
      actionDetail: `Cập nhật quy tắc tích điểm "${saved.name}"`,
      before: JSON.stringify(beforeSnapshot),
      after: JSON.stringify({ name: saved.name, isActive: saved.isActive, pointsPerUnit: saved.pointsPerUnit, spendPerUnit: Number(saved.spendPerUnit) }),
    });
    return this.toEarnRuleDto(saved);
  }

  async deleteEarnRule(id: number): Promise<void> {
    const rule = await this.earnRuleRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException(`Earn rule #${id} không tồn tại`);
    await this.earnRuleRepo.remove(rule);
    this.auditLogsService.log({
      entityType: 'LoyaltyEarnRule',
      entityId: String(id),
      entityLabel: rule.name,
      actionType: 'Xoa',
      actionDetail: `Xóa quy tắc tích điểm "${rule.name}"`,
      before: JSON.stringify({ name: rule.name, isActive: rule.isActive }),
    });
  }

  // ─── Point Balance ────────────────────────────────────────────────────────

  async getBalance(khachHangId: number): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT diem_hien_tai FROM khach_hang WHERE khach_hang_id = ?`,
      [khachHangId],
    );
    return result[0]?.diem_hien_tai ?? 0;
  }

  async getTransactions(khachHangId: number): Promise<LoyaltyTransactionResponseDto[]> {
    const rows = await this.transactionRepo.find({
      where: { khachHangId },
      order: { ngayTao: 'DESC' },
      take: 100,
    });
    return rows.map((t) => this.toTransactionDto(t));
  }

  async getTransactionsPaginated(
    khachHangId: number,
    page = 1,
    limit = 10,
  ): Promise<{ items: LoyaltyTransactionResponseDto[]; total: number; page: number; limit: number; totalPages: number }> {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 10));
    const [rows, total] = await this.transactionRepo.findAndCount({
      where: { khachHangId },
      order: { ngayTao: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    return {
      items: rows.map((t) => this.toTransactionDto(t)),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  // ─── Earn Points (called when order → DaGiao) ─────────────────────────────

  async earnPointsForOrder(
    manager: EntityManager,
    khachHangId: number,
    orderId: number,
    orderTotal: number,
    categoryIds: number[],
  ): Promise<number> {
    const rules = await this.findActiveEarnRules();
    if (rules.length === 0) return 0;

    const rule = rules[0];
    if (rule.minOrderValue && orderTotal < rule.minOrderValue) return 0;

    let multiplier = 1;
    if (rule.scopes && rule.scopes.length > 0) {
      const match = rule.scopes.find(
        (s) => s.scopeType === 'category' && categoryIds.includes(Number(s.scopeRefId)),
      );
      if (match) multiplier = Number(match.multiplier);
    }

    let earned = Math.floor((orderTotal / rule.spendPerUnit) * rule.pointsPerUnit * multiplier);
    if (rule.maxPointsPerOrder) earned = Math.min(earned, rule.maxPointsPerOrder);
    if (earned <= 0) return 0;

    const tx = await this.writeTransaction(manager, {
      khachHangId,
      loaiGiaoDich: 'earn',
      diem: earned,
      moTa: `Tích điểm đơn hàng #${orderId}`,
      loaiThamChieu: 'don_hang',
      thamChieuId: orderId,
    });

    this.auditLogsService.log({
      entityType: 'DiemTichLuy',
      entityId: String(khachHangId),
      entityLabel: `Khách hàng #${khachHangId}`,
      actionType: 'CapNhat',
      actionDetail: `Tích ${earned} điểm từ đơn hàng #${orderId}`,
      before: JSON.stringify({ diemHienTai: tx.soDuTruoc }),
      after: JSON.stringify({ diemHienTai: tx.soDuSau }),
    });

    return earned;
  }

  async deductPointsForReturn(
    manager: EntityManager,
    khachHangId: number,
    orderId: number,
    earnedPoints: number,
  ): Promise<void> {
    if (earnedPoints <= 0) return;
    const balance = await this.getBalance(khachHangId);
    const actual = Math.min(earnedPoints, balance);
    const tx = await this.writeTransaction(manager, {
      khachHangId,
      loaiGiaoDich: 'adjust',
      diem: -actual,
      moTa: `Hoàn điểm do trả hàng đơn #${orderId}`,
      loaiThamChieu: 'don_hang',
      thamChieuId: orderId,
    });
    this.auditLogsService.log({
      entityType: 'DiemTichLuy',
      entityId: String(khachHangId),
      entityLabel: `Khách hàng #${khachHangId}`,
      actionType: 'CapNhat',
      actionDetail: `Trừ ${actual} điểm do hoàn trả đơn hàng #${orderId}`,
      before: JSON.stringify({ diemHienTai: tx.soDuTruoc }),
      after: JSON.stringify({ diemHienTai: tx.soDuSau }),
    });
  }

  async adjustPoints(dto: AdjustPointsDto): Promise<LoyaltyTransactionResponseDto> {
    const tx = await this.dataSource.transaction((manager) =>
      this.writeTransaction(manager, {
        khachHangId: dto.khachHangId,
        loaiGiaoDich: dto.diem >= 0 ? 'earn' : 'adjust',
        diem: dto.diem,
        moTa: dto.moTa,
        loaiThamChieu: dto.loaiThamChieu ?? 'admin_adjust',
        thamChieuId: dto.thamChieuId ?? null,
      }),
    );
    this.auditLogsService.log({
      entityType: 'DiemTichLuy',
      entityId: String(dto.khachHangId),
      entityLabel: `Khách hàng #${dto.khachHangId}`,
      actionType: 'CapNhat',
      actionDetail: `Điều chỉnh điểm ${dto.diem >= 0 ? '+' : ''}${dto.diem} — ${dto.moTa}`,
      before: JSON.stringify({ diemHienTai: tx.soDuTruoc }),
      after: JSON.stringify({ diemHienTai: tx.soDuSau }),
    });
    return this.toTransactionDto(tx);
  }

  async writeTransaction(
    manager: EntityManager,
    params: {
      khachHangId: number;
      loaiGiaoDich: LoyaltyTransaction['loaiGiaoDich'];
      diem: number;
      moTa: string;
      loaiThamChieu?: LoyaltyTransaction['loaiThamChieu'];
      thamChieuId?: number | null;
    },
  ): Promise<LoyaltyTransaction> {
    const [row] = await manager.query(
      `SELECT diem_hien_tai FROM khach_hang WHERE khach_hang_id = ? FOR UPDATE`,
      [params.khachHangId],
    );
    const current: number = row?.diem_hien_tai ?? 0;
    const after = current + params.diem;
    if (after < 0) throw new BadRequestException('Số điểm không đủ để thực hiện');

    await manager.query(
      `UPDATE khach_hang SET diem_hien_tai = ? WHERE khach_hang_id = ?`,
      [after, params.khachHangId],
    );

    return manager.save(LoyaltyTransaction, {
      khachHangId: params.khachHangId,
      loaiGiaoDich: params.loaiGiaoDich,
      diem: params.diem,
      soDuTruoc: current,
      soDuSau: after,
      moTa: params.moTa,
      loaiThamChieu: params.loaiThamChieu ?? null,
      thamChieuId: params.thamChieuId ?? null,
    });
  }

  // ─── Redemption Catalog ───────────────────────────────────────────────────

  async createCatalogItem(dto: CreateRedemptionCatalogDto): Promise<RedemptionCatalogResponseDto> {
    const saved = await this.catalogRepo.save(this.catalogRepo.create(dto));
    const withPromotion = await this.catalogRepo.findOne({
      where: { id: saved.id },
      relations: ['promotion'],
    });
    this.auditLogsService.log({
      entityType: 'LoyaltyCatalog',
      entityId: String(saved.id),
      entityLabel: saved.ten,
      actionType: 'TaoMoi',
      actionDetail: `Tạo phần thưởng đổi điểm "${saved.ten}"`,
      after: JSON.stringify({ ten: saved.ten, diemCan: saved.diemCan, laHoatDong: saved.laHoatDong }),
    });
    return this.toCatalogDto(withPromotion!);
  }

  async findActiveCatalog(): Promise<RedemptionCatalogResponseDto[]> {
    const now = new Date();
    const list = await this.catalogRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.promotion', 'promotion')
      .where('c.la_hoat_dong = 1')
      .andWhere('(c.hieu_luc_tu IS NULL OR c.hieu_luc_tu <= :now)', { now })
      .andWhere('(c.hieu_luc_den IS NULL OR c.hieu_luc_den >= :now)', { now })
      .getMany();
    return list.map((c) => this.toCatalogDto(c));
  }

  async findAllCatalog(page = 1, limit = 20, search?: string): Promise<{ data: RedemptionCatalogResponseDto[]; total: number; totalPages: number }> {
    const qb = this.catalogRepo.createQueryBuilder('c')
      .leftJoinAndSelect('c.promotion', 'promotion')
      .orderBy('c.ngayTao', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (search) {
      qb.where('(c.ten LIKE :s OR c.moTa LIKE :s)', { s: `%${search}%` });
    }
    const [list, total] = await qb.getManyAndCount();
    return { data: list.map((c) => this.toCatalogDto(c)), total, totalPages: Math.ceil(total / limit) };
  }

  async updateCatalogItem(id: number, dto: UpdateRedemptionCatalogDto): Promise<RedemptionCatalogResponseDto> {
    const catalog = await this.catalogRepo.findOne({ where: { id } });
    if (!catalog) throw new NotFoundException(`Catalog item #${id} không tồn tại`);
    const beforeSnapshot = { ten: catalog.ten, diemCan: catalog.diemCan, laHoatDong: catalog.laHoatDong };
    Object.assign(catalog, dto);
    await this.catalogRepo.save(catalog);
    const withPromotion = await this.catalogRepo.findOne({
      where: { id },
      relations: ['promotion'],
    });
    this.auditLogsService.log({
      entityType: 'LoyaltyCatalog',
      entityId: String(id),
      entityLabel: catalog.ten,
      actionType: 'CapNhat',
      actionDetail: `Cập nhật phần thưởng đổi điểm "${catalog.ten}"`,
      before: JSON.stringify(beforeSnapshot),
      after: JSON.stringify({ ten: catalog.ten, diemCan: catalog.diemCan, laHoatDong: catalog.laHoatDong }),
    });
    return this.toCatalogDto(withPromotion!);
  }

  async deleteCatalogItem(id: number): Promise<void> {
    const catalog = await this.catalogRepo.findOne({ where: { id } });
    if (!catalog) throw new NotFoundException(`Catalog item #${id} không tồn tại`);
    await this.catalogRepo.remove(catalog);
    this.auditLogsService.log({
      entityType: 'LoyaltyCatalog',
      entityId: String(id),
      entityLabel: catalog.ten,
      actionType: 'Xoa',
      actionDetail: `Xóa phần thưởng đổi điểm "${catalog.ten}"`,
      before: JSON.stringify({ ten: catalog.ten, diemCan: catalog.diemCan }),
    });
  }

  // ─── Redeem Points ────────────────────────────────────────────────────────

  async redeemPoints(dto: RedeemPointsDto, khachHangId: number): Promise<LoyaltyRedemptionResponseDto> {
    const redemption = await this.dataSource.transaction(async (manager) => {
      const catalog = await this.catalogRepo.findOne({ where: { id: dto.catalogId, laHoatDong: true } });
      if (!catalog) throw new NotFoundException('Phần thưởng không tồn tại hoặc không còn hiệu lực');

      if (catalog.gioiHanTonKho !== null && catalog.soDaDoi >= catalog.gioiHanTonKho) {
        throw new BadRequestException('Phần thưởng đã hết số lượng');
      }

      const [promoRow] = await manager.query(
        `SELECT code FROM promotions WHERE promotion_id = ?`,
        [catalog.promotionId],
      );
      const maCoupon: string = promoRow?.code ?? '';

      await this.writeTransaction(manager, {
        khachHangId,
        loaiGiaoDich: 'redeem',
        diem: -catalog.diemCan,
        moTa: `Đổi điểm lấy: ${catalog.ten}`,
        loaiThamChieu: 'loyalty_redemption',
      });

      await manager.increment(RedemptionCatalog, { id: catalog.id }, 'soDaDoi', 1);

      return manager.save(LoyaltyRedemption, {
        khachHangId,
        catalogId: catalog.id,
        tenSnapshot: catalog.ten,
        diemDaDoi: catalog.diemCan,
        maCoupon,
        promotionId: catalog.promotionId,
        trangThai: 'completed',
      });
    });
    return this.toRedemptionDto(redemption);
  }

  async getMyRedemptions(khachHangId: number): Promise<LoyaltyRedemptionResponseDto[]> {
    const list = await this.redemptionRepo.find({ where: { khachHangId }, order: { ngayDoi: 'DESC' } });
    return list.map((r) => this.toRedemptionDto(r));
  }

  async getMyRedemptionsPaginated(
    khachHangId: number,
    page = 1,
    limit = 10,
  ): Promise<{ items: LoyaltyRedemptionResponseDto[]; total: number; page: number; limit: number; totalPages: number }> {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 10));
    const [rows, total] = await this.redemptionRepo.findAndCount({
      where: { khachHangId },
      order: { ngayDoi: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    return {
      items: rows.map((r) => this.toRedemptionDto(r)),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  // ─── Mappers ──────────────────────────────────────────────────────────────

  /** Public-safe mapper for storefront use (no internal-only fields). */
  toEarnRulePublicDto(r: LoyaltyEarnRule): EarnRuleResponseDto {
    return this.toEarnRuleDto(r);
  }

  private toEarnRuleDto(r: LoyaltyEarnRule): EarnRuleResponseDto {
    return {
      id: String(r.id),
      name: r.name,
      description: r.description,
      pointsPerUnit: r.pointsPerUnit,
      spendPerUnit: Number(r.spendPerUnit),
      minOrderValue: r.minOrderValue !== null ? Number(r.minOrderValue) : null,
      maxPointsPerOrder: r.maxPointsPerOrder,
      bonusTrigger: r.bonusTrigger ?? null,
      bonusPoints: r.bonusPoints ?? null,
      scopes: (r.scopes ?? []).map((s) => this.toScopeDto(s)),
      isActive: r.isActive,
      priority: r.priority,
      validFrom: r.validFrom,
      validUntil: r.validUntil,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private toScopeDto(s: LoyaltyEarnRuleScope): EarnRuleScopeResponseDto {
    return {
      id: String(s.id),
      ruleId: String(s.earnRuleId),
      scopeType: s.scopeType,
      scopeRefId: s.scopeRefId,
      scopeRefLabel: s.scopeRefLabel,
      multiplier: Number(s.multiplier),
    };
  }

  private toTransactionDto(t: LoyaltyTransaction): LoyaltyTransactionResponseDto {
    return {
      id: t.id,
      customerId: t.khachHangId,
      transactionType: t.loaiGiaoDich,
      points: t.diem,
      balanceBefore: t.soDuTruoc,
      balanceAfter: t.soDuSau,
      description: t.moTa,
      referenceType: t.loaiThamChieu,
      referenceId: t.thamChieuId,
      createdAt: t.ngayTao,
    };
  }

  private toCatalogDto(c: RedemptionCatalog & { promotion?: any }): RedemptionCatalogResponseDto {
    return {
      id: String(c.id),
      name: c.ten,
      description: c.moTa,
      pointsRequired: c.diemCan,
      promotionId: String(c.promotionId),
      promotionCode: c.promotion?.code ?? undefined,
      promotionName: c.promotion?.name ?? undefined,
      isActive: c.laHoatDong,
      stockLimit: c.gioiHanTonKho,
      redeemed: c.soDaDoi,
      validFrom: c.hieuLucTu,
      validUntil: c.hieuLucDen,
      createdAt: c.ngayTao,
      updatedAt: c.ngayCapNhat,
    };
  }

  private toRedemptionDto(r: LoyaltyRedemption): LoyaltyRedemptionResponseDto {
    return {
      id: r.id,
      customerId: r.khachHangId,
      catalogId: r.catalogId,
      nameSnapshot: r.tenSnapshot,
      pointsRedeemed: r.diemDaDoi,
      couponCode: r.maCoupon,
      status: r.trangThai,
      redeemedAt: r.ngayDoi,
    };
  }

  // ─── Admin: Customer Loyalty View ─────────────────────────────────────────

  async getCustomerSummary(customerId: number): Promise<{
    currentBalance: number;
    lifetimeEarned: number;
    lifetimeSpent: number;
    totalRedemptions: number;
  }> {
    const currentBalance = await this.getBalance(customerId);

    const earnedRow = await this.transactionRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.diem), 0)', 'sum')
      .where('t.khach_hang_id = :id', { id: customerId })
      .andWhere('t.diem > 0')
      .getRawOne<{ sum: string }>();

    const spentRow = await this.transactionRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(-t.diem), 0)', 'sum')
      .where('t.khach_hang_id = :id', { id: customerId })
      .andWhere('t.diem < 0')
      .getRawOne<{ sum: string }>();

    const totalRedemptions = await this.redemptionRepo.count({
      where: { khachHangId: customerId },
    });

    return {
      currentBalance,
      lifetimeEarned: Number(earnedRow?.sum ?? 0),
      lifetimeSpent: Number(spentRow?.sum ?? 0),
      totalRedemptions,
    };
  }

  async getCustomerTransactionsAdmin(customerId: number) {
    const rows = await this.transactionRepo.find({
      where: { khachHangId: customerId },
      order: { ngayTao: 'DESC' },
      take: 100,
    });
    return {
      data: rows.map((t) => ({
        id: String(t.id),
        customerId: String(t.khachHangId),
        type: t.loaiGiaoDich,
        points: t.diem,
        balanceBefore: t.soDuTruoc,
        balanceAfter: t.soDuSau,
        description: t.moTa,
        referenceType: t.loaiThamChieu ?? undefined,
        referenceId: t.thamChieuId != null ? String(t.thamChieuId) : undefined,
        createdAt: t.ngayTao,
      })),
    };
  }

  async getCustomerRedemptionsAdmin(customerId: number) {
    const rows = await this.redemptionRepo.find({
      where: { khachHangId: customerId },
      order: { ngayDoi: 'DESC' },
    });
    return {
      data: rows.map((r) => ({
        id: String(r.id),
        customerId: String(r.khachHangId),
        catalogItemId: String(r.catalogId),
        catalogItemName: r.tenSnapshot,
        pointsSpent: r.diemDaDoi,
        couponCode: r.maCoupon,
        promotionId: String(r.promotionId),
        status: r.trangThai,
        redeemedAt: r.ngayDoi,
        usedAt: r.ngaySuDung ?? undefined,
        orderId: r.donHangId != null ? String(r.donHangId) : undefined,
      })),
    };
  }

  // ─── Membership Tiers ─────────────────────────────────────────────────────

  /** @deprecated Use MembershipTierService.findAll() instead */
  async findAllMembershipTiers(activeOnly = false): Promise<MembershipTierResponseDto[]> {
    const where = activeOnly ? { isActive: true } : {};
    const tiers = await this.tierRepo.find({ where, order: { minPoints: 'ASC' } });
    return tiers.map((t) => ({
      id: t.id,
      name: t.name,
      displayName: t.displayName,
      minPoints: t.minPoints,
      maxPoints: t.maxPoints,
      color: t.color,
      description: t.description,
      sortOrder: t.sortOrder,
      isActive: t.isActive,
      customerCount: 0,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }
}
