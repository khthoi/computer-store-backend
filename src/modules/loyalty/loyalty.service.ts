import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { LoyaltyEarnRule } from './entities/loyalty-earn-rule.entity';
import { LoyaltyTransaction } from './entities/loyalty-transaction.entity';
import { RedemptionCatalog } from './entities/redemption-catalog.entity';
import { LoyaltyRedemption } from './entities/loyalty-redemption.entity';
import { CreateEarnRuleDto } from './dto/create-earn-rule.dto';
import { RedeemPointsDto } from './dto/redeem-points.dto';
import { CreateRedemptionCatalogDto } from './dto/create-redemption-catalog.dto';
import { AdjustPointsDto } from './dto/adjust-points.dto';
import {
  EarnRuleResponseDto,
  LoyaltyTransactionResponseDto,
  LoyaltyRedemptionResponseDto,
  RedemptionCatalogResponseDto,
} from './dto/loyalty-response.dto';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(LoyaltyEarnRule)
    private readonly earnRuleRepo: Repository<LoyaltyEarnRule>,
    @InjectRepository(LoyaltyTransaction)
    private readonly transactionRepo: Repository<LoyaltyTransaction>,
    @InjectRepository(RedemptionCatalog)
    private readonly catalogRepo: Repository<RedemptionCatalog>,
    @InjectRepository(LoyaltyRedemption)
    private readonly redemptionRepo: Repository<LoyaltyRedemption>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Earn Rules ───────────────────────────────────────────────────────────

  async createEarnRule(dto: CreateEarnRuleDto, createdBy: number): Promise<EarnRuleResponseDto> {
    const rule = this.earnRuleRepo.create({ ...dto, createdBy });
    return this.toEarnRuleDto(await this.earnRuleRepo.save(rule));
  }

  async findAllEarnRules(): Promise<EarnRuleResponseDto[]> {
    const rules = await this.earnRuleRepo.find({ relations: ['scopes'], order: { priority: 'DESC' } });
    return rules.map((r) => this.toEarnRuleDto(r));
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
    Object.assign(rule, dto);
    return this.toEarnRuleDto(await this.earnRuleRepo.save(rule));
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

    await this.writeTransaction(manager, {
      khachHangId,
      loaiGiaoDich: 'earn',
      diem: earned,
      moTa: `Tích điểm đơn hàng #${orderId}`,
      loaiThamChieu: 'don_hang',
      thamChieuId: orderId,
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
    await this.writeTransaction(manager, {
      khachHangId,
      loaiGiaoDich: 'adjust',
      diem: -actual,
      moTa: `Hoàn điểm do trả hàng đơn #${orderId}`,
      loaiThamChieu: 'don_hang',
      thamChieuId: orderId,
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
    return this.toTransactionDto(tx);
  }

  // Atomic write: locks khach_hang row, updates balance, inserts transaction
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
    const catalog = await this.catalogRepo.save(this.catalogRepo.create(dto));
    return this.toCatalogDto(catalog);
  }

  async findActiveCatalog(): Promise<RedemptionCatalogResponseDto[]> {
    const now = new Date();
    const list = await this.catalogRepo
      .createQueryBuilder('c')
      .where('c.la_hoat_dong = 1')
      .andWhere('(c.hieu_luc_tu IS NULL OR c.hieu_luc_tu <= :now)', { now })
      .andWhere('(c.hieu_luc_den IS NULL OR c.hieu_luc_den >= :now)', { now })
      .getMany();
    return list.map((c) => this.toCatalogDto(c));
  }

  async findAllCatalog(): Promise<RedemptionCatalogResponseDto[]> {
    const list = await this.catalogRepo.find({ order: { ngayTao: 'DESC' } });
    return list.map((c) => this.toCatalogDto(c));
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

  // ─── Mappers ──────────────────────────────────────────────────────────────

  private toEarnRuleDto(r: LoyaltyEarnRule): EarnRuleResponseDto {
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      pointsPerUnit: r.pointsPerUnit,
      spendPerUnit: Number(r.spendPerUnit),
      minOrderValue: r.minOrderValue !== null ? Number(r.minOrderValue) : null,
      maxPointsPerOrder: r.maxPointsPerOrder,
      isActive: r.isActive,
      priority: r.priority,
      validFrom: r.validFrom,
      validUntil: r.validUntil,
      createdAt: r.createdAt,
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

  private toCatalogDto(c: RedemptionCatalog): RedemptionCatalogResponseDto {
    return {
      id: c.id,
      name: c.ten,
      description: c.moTa,
      pointsRequired: c.diemCan,
      isActive: c.laHoatDong,
      stockLimit: c.gioiHanTonKho,
      redeemed: c.soDaDoi,
      validFrom: c.hieuLucTu,
      validUntil: c.hieuLucDen,
      createdAt: c.ngayTao,
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
}
