import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ReturnRequest } from './entities/return-request.entity';
import { ReturnAsset } from './entities/return-asset.entity';
import { CreateReturnDto } from './dto/create-return.dto';
import { ProcessReturnDto } from './dto/process-return.dto';
import { QueryReturnsDto } from './dto/query-returns.dto';
import { LoyaltyService } from '../loyalty/loyalty.service';

const DEFAULT_RETURN_WINDOW_DAYS = 7;

@Injectable()
export class ReturnsService {
  constructor(
    @InjectRepository(ReturnRequest)
    private readonly returnRepo: Repository<ReturnRequest>,
    @InjectRepository(ReturnAsset)
    private readonly assetRepo: Repository<ReturnAsset>,
    private readonly loyaltyService: LoyaltyService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Customer ─────────────────────────────────────────────────────────────

  async submitReturn(dto: CreateReturnDto, customerId: number): Promise<ReturnRequest> {
    // Validate order belongs to customer and is delivered
    const [order] = await this.dataSource.query(
      `SELECT don_hang_id, trang_thai_don, ngay_cap_nhat
       FROM don_hang
       WHERE don_hang_id = ? AND khach_hang_id = ?`,
      [dto.orderId, customerId],
    );
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại hoặc không thuộc về bạn');
    if (order.trang_thai_don !== 'DaGiao') {
      throw new ForbiddenException('Chỉ có thể yêu cầu đổi/trả đơn hàng đã giao thành công');
    }

    // Enforce return window from site_config (fallback to 7 days)
    const returnWindowDays = await this.getReturnWindowDays();
    const deliveredAt = new Date(order.ngay_cap_nhat);
    const diffDays = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > returnWindowDays) {
      throw new ForbiddenException(`Đã quá ${returnWindowDays} ngày kể từ ngày giao hàng`);
    }

    // Prevent duplicate pending request for same order
    const existing = await this.returnRepo.findOne({
      where: { orderId: dto.orderId, customerId, status: 'ChoDuyet' },
    });
    if (existing) {
      throw new BadRequestException('Đơn hàng này đã có yêu cầu đổi/trả đang chờ duyệt');
    }

    return this.dataSource.transaction(async (manager) => {
      const returnReq = manager.create(ReturnRequest, {
        orderId: dto.orderId,
        customerId,
        requestType: dto.requestType,
        reason: dto.reason,
        description: dto.description ?? null,
        status: 'ChoDuyet',
      });
      const saved = await manager.save(returnReq);

      if (dto.assetIds && dto.assetIds.length > 0) {
        const assets = dto.assetIds.map((assetId, index) =>
          manager.create(ReturnAsset, {
            returnRequestId: saved.id,
            assetId,
            sortOrder: index,
          }),
        );
        await manager.save(assets);
      }

      return saved;
    });
  }

  getMyReturns(customerId: number, query: QueryReturnsDto) {
    const qb = this.returnRepo.createQueryBuilder('r')
      .where('r.khach_hang_id = :customerId', { customerId });

    if (query.status) {
      qb.andWhere('r.trang_thai = :status', { status: query.status });
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return qb
      .orderBy('r.ngay_tao', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount()
      .then(([items, total]) => ({ items, total, page, limit }));
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async findAll(query: QueryReturnsDto) {
    const qb = this.returnRepo.createQueryBuilder('r');

    if (query.status) {
      qb.andWhere('r.trang_thai = :status', { status: query.status });
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await qb
      .orderBy('r.ngay_tao', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  async processReturn(id: number, dto: ProcessReturnDto, employeeId: number): Promise<ReturnRequest> {
    const returnReq = await this.returnRepo.findOne({ where: { id } });
    if (!returnReq) throw new NotFoundException(`Yêu cầu đổi/trả #${id} không tồn tại`);

    const previousStatus = returnReq.status;
    returnReq.status = dto.status;
    returnReq.processedById = employeeId;
    if (dto.inspectionResult) returnReq.inspectionResult = dto.inspectionResult;
    if (dto.resolution) returnReq.resolution = dto.resolution;

    const saved = await this.returnRepo.save(returnReq);

    // Side effects when completing a return
    if (dto.status === 'HoanThanh' && previousStatus !== 'HoanThanh') {
      await this.handleReturnCompletion(returnReq);
    }

    return saved;
  }

  async getReturnAssets(returnRequestId: number): Promise<ReturnAsset[]> {
    return this.assetRepo.find({
      where: { returnRequestId },
      order: { sortOrder: 'ASC' },
    });
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  private async handleReturnCompletion(returnReq: ReturnRequest): Promise<void> {
    if (returnReq.resolution === 'BaoHanh') return;

    // Restore stock and deduct loyalty points inside one transaction
    await this.dataSource.transaction(async (manager) => {
      // Restore stock for each order item
      const items = await manager.query(
        `SELECT phien_ban_id, so_luong FROM chi_tiet_don_hang WHERE don_hang_id = ?`,
        [returnReq.orderId],
      );
      for (const item of items) {
        await manager.query(
          `UPDATE ton_kho SET so_luong_ton = so_luong_ton + ?
           WHERE phien_ban_id = ?`,
          [item.so_luong, item.phien_ban_id],
        );
        await manager.query(
          `INSERT INTO lich_su_nhap_xuat
             (phien_ban_id, loai, so_luong, ly_do, ngay_tao)
           VALUES (?, 'HoanTra', ?, ?, NOW())`,
          [item.phien_ban_id, item.so_luong, `Hoàn trả yêu cầu #${returnReq.id}`],
        );
      }

      // Deduct loyalty points earned from this order
      const [loyaltyRow] = await manager.query(
        `SELECT diem FROM loyalty_point_transaction
         WHERE loai_tham_chieu = 'don_hang' AND tham_chieu_id = ? AND loai_giao_dich = 'earn'
         LIMIT 1`,
        [returnReq.orderId],
      );
      if (loyaltyRow) {
        await this.loyaltyService.deductPointsForReturn(
          manager,
          returnReq.customerId,
          returnReq.orderId,
          loyaltyRow.diem,
        );
      }
    });
  }

  private async getReturnWindowDays(): Promise<number> {
    const [config] = await this.dataSource.query(
      `SELECT config_value FROM site_config WHERE config_key = 'return_window_days' LIMIT 1`,
    );
    return config ? parseInt(config.config_value, 10) : DEFAULT_RETURN_WINDOW_DAYS;
  }
}
