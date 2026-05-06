import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ReturnRequest } from './entities/return-request.entity';
import { ReturnAsset } from './entities/return-asset.entity';
import { ReturnRequestItem } from './entities/return-request-item.entity';
import { CreateReturnDto } from './dto/create-return.dto';
import { ProcessReturnDto, RejectAfterInspectionDto } from './dto/process-return.dto';
import { ConfirmGoodsReceivedDto } from './dto/confirm-received.dto';
import { ReturnRequestResponseDto } from './dto/return-response.dto';
import { ReturnsQueryService } from './returns-query.service';

const DEFAULT_RETURN_WINDOW_DAYS = 7;

@Injectable()
export class ReturnsWorkflowService {
  constructor(
    @InjectRepository(ReturnRequest)
    private readonly returnRepo: Repository<ReturnRequest>,
    @InjectRepository(ReturnAsset)
    private readonly assetRepo: Repository<ReturnAsset>,
    @InjectRepository(ReturnRequestItem)
    private readonly returnItemRepo: Repository<ReturnRequestItem>,
    private readonly dataSource: DataSource,
    private readonly queryService: ReturnsQueryService,
  ) {}

  async submitReturn(dto: CreateReturnDto, customerId: number): Promise<ReturnRequestResponseDto> {
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

    const returnWindowDays = await this.getReturnWindowDays();
    const deliveredAt = new Date(order.ngay_cap_nhat);
    const diffDays = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > returnWindowDays) {
      throw new ForbiddenException(`Đã quá ${returnWindowDays} ngày kể từ ngày giao hàng`);
    }

    const existing = await this.returnRepo.findOne({
      where: { orderId: dto.orderId, customerId, status: 'ChoDuyet' },
    });
    if (existing) throw new BadRequestException('Đơn hàng này đã có yêu cầu đổi/trả đang chờ duyệt');

    if (dto.requestType === 'TraHang' && (!dto.items || dto.items.length === 0)) {
      throw new BadRequestException('Yêu cầu trả hàng phải chỉ định ít nhất một sản phẩm');
    }

    if (dto.requestType === 'BaoHanh' && dto.items && dto.items.length > 0) {
      for (const item of dto.items) {
        const [variant]: Array<{ thoi_gian_bao_hanh: number | null }> = await this.dataSource.query(
          `SELECT thoi_gian_bao_hanh FROM phien_ban_san_pham WHERE phien_ban_id = ?`,
          [item.variantId],
        );
        if (variant?.thoi_gian_bao_hanh != null) {
          const expiry = new Date(deliveredAt);
          expiry.setMonth(expiry.getMonth() + variant.thoi_gian_bao_hanh);
          if (new Date() > expiry) {
            throw new BadRequestException(
              `Sản phẩm ID ${item.variantId} đã hết hạn bảo hành (${expiry.toLocaleDateString('vi-VN')})`,
            );
          }
        }
      }
    }

    if (dto.items && dto.items.length > 0) {
      const variantIds = dto.items.map((i) => i.variantId);
      const orderItems: Array<{ phien_ban_id: number; so_luong: number }> = await this.dataSource.query(
        `SELECT phien_ban_id, so_luong FROM chi_tiet_don_hang WHERE don_hang_id = ? AND phien_ban_id IN (?)`,
        [dto.orderId, variantIds],
      );
      const orderItemMap = new Map(orderItems.map((r) => [r.phien_ban_id, r.so_luong]));
      for (const item of dto.items) {
        const orderedQty = orderItemMap.get(item.variantId);
        if (orderedQty === undefined) {
          throw new BadRequestException(`Phiên bản sản phẩm ${item.variantId} không thuộc đơn hàng này`);
        }
        if (item.quantity > orderedQty) {
          throw new BadRequestException(
            `Phiên bản ${item.variantId}: số lượng yêu cầu (${item.quantity}) vượt quá số lượng đã đặt (${orderedQty})`,
          );
        }
      }
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const returnReq = manager.create(ReturnRequest, {
        orderId: dto.orderId, customerId,
        requestType: dto.requestType, reason: dto.reason,
        description: dto.description ?? null, status: 'ChoDuyet',
      });
      const result = await manager.save(returnReq);

      if (dto.assetIds && dto.assetIds.length > 0) {
        const assets = dto.assetIds.map((assetId, index) =>
          manager.create(ReturnAsset, { returnRequestId: result.id, assetId, sortOrder: index }),
        );
        await manager.save(assets);
      }

      if (dto.items && dto.items.length > 0) {
        const items = dto.items.map((item) =>
          manager.create(ReturnRequestItem, {
            yeuCauId: result.id, phienBanId: item.variantId, soLuong: item.quantity,
          }),
        );
        await manager.save(items);
      }

      return result;
    });

    return this.queryService.toDto(saved);
  }

  async processReturn(id: number, dto: ProcessReturnDto, employeeId: number) {
    const returnReq = await this.returnRepo.findOne({ where: { id } });
    if (!returnReq) throw new NotFoundException(`Yêu cầu đổi/trả #${id} không tồn tại`);

    returnReq.status = dto.status;
    returnReq.processedById = employeeId;
    if (dto.status === 'DaDuyet') returnReq.approvedAt = new Date();
    if (dto.inspectionResult) returnReq.inspectionResult = dto.inspectionResult;
    if (dto.resolution) returnReq.resolution = dto.resolution;

    await this.returnRepo.save(returnReq);
    return this.queryService.findOne(id);
  }

  async confirmGoodsReceived(id: number, dto: ConfirmGoodsReceivedDto, employeeId: number) {
    const returnReq = await this.returnRepo.findOne({ where: { id } });
    if (!returnReq) throw new NotFoundException(`Yêu cầu đổi/trả #${id} không tồn tại`);
    if (!['ChoDuyet', 'DaDuyet'].includes(returnReq.status)) {
      throw new BadRequestException('Chỉ có thể xác nhận nhận hàng khi yêu cầu ở trạng thái ChoDuyet hoặc DaDuyet');
    }

    returnReq.status = 'DaNhanHang';
    returnReq.returnReceivedAt = new Date();
    returnReq.returnReceivedById = employeeId;
    if (dto.returnTrackingCode) returnReq.returnTrackingCode = dto.returnTrackingCode;
    if (dto.returnCarrier) returnReq.returnCarrier = dto.returnCarrier;

    await this.returnRepo.save(returnReq);
    return this.queryService.findOne(id);
  }

  async updateInspectionResult(id: number, inspectionResult: string, employeeId: number) {
    const returnReq = await this.returnRepo.findOne({ where: { id } });
    if (!returnReq) throw new NotFoundException(`Yêu cầu đổi/trả #${id} không tồn tại`);
    if (!['DaNhanHang', 'DaKiemTra', 'DangXuLy'].includes(returnReq.status)) {
      throw new BadRequestException(
        'Chỉ có thể ghi kết quả kiểm tra khi hàng đã về kho (DaNhanHang, DaKiemTra hoặc DangXuLy)',
      );
    }

    returnReq.inspectionResult = inspectionResult;
    returnReq.processedById = returnReq.processedById ?? employeeId;
    await this.returnRepo.save(returnReq);
    return this.queryService.findOne(id);
  }

  async completeInspection(id: number, employeeId: number) {
    const returnReq = await this.returnRepo.findOne({ where: { id } });
    if (!returnReq) throw new NotFoundException(`Yêu cầu đổi/trả #${id} không tồn tại`);
    if (returnReq.status !== 'DaNhanHang') {
      throw new BadRequestException('Chỉ có thể xác nhận kiểm tra khi yêu cầu ở trạng thái DaNhanHang');
    }
    if (!returnReq.inspectionResult?.trim()) {
      throw new BadRequestException('Vui lòng ghi kết quả kiểm tra trước khi xác nhận hoàn tất');
    }

    const [{ count }]: [{ count: string }] = await this.dataSource.query(
      `SELECT COUNT(*) AS count FROM yeu_cau_doi_tra_asset WHERE yeu_cau_id = ? AND loai_asset = 'inspection_evidence'`,
      [id],
    );
    if (Number(count) === 0) {
      throw new BadRequestException('Vui lòng thêm ít nhất 1 ảnh bằng chứng kiểm tra');
    }

    returnReq.status = 'DaKiemTra';
    returnReq.inspectedAt = new Date();
    returnReq.processedById = returnReq.processedById ?? employeeId;
    await this.returnRepo.save(returnReq);
    return this.queryService.findOne(id);
  }

  async rejectAfterInspection(id: number, dto: RejectAfterInspectionDto, employeeId: number) {
    const returnReq = await this.returnRepo.findOne({ where: { id } });
    if (!returnReq) throw new NotFoundException(`Yêu cầu đổi/trả #${id} không tồn tại`);
    if (returnReq.status !== 'DaKiemTra') {
      throw new BadRequestException('Chỉ có thể từ chối nhận hàng khi yêu cầu ở trạng thái DaKiemTra');
    }

    returnReq.status = 'TuChoiNhanHang';
    returnReq.processedById = returnReq.processedById ?? employeeId;
    if (dto.rejectTrackingCode) returnReq.rejectTrackingCode = dto.rejectTrackingCode;
    if (dto.rejectCarrier) returnReq.rejectCarrier = dto.rejectCarrier;
    if (dto.rejectNotes) returnReq.rejectNotes = dto.rejectNotes;
    returnReq.rejectedAt = new Date();
    returnReq.rejectedById = employeeId;

    await this.returnRepo.save(returnReq);
    return this.queryService.findOne(id);
  }

  async addReturnAsset(
    returnRequestId: number,
    assetId: number,
    loaiAsset: 'customer_evidence' | 'inspection_evidence',
  ) {
    const returnReq = await this.returnRepo.findOne({ where: { id: returnRequestId } });
    if (!returnReq) throw new NotFoundException(`Yêu cầu đổi/trả #${returnRequestId} không tồn tại`);

    const [maxRow]: Array<{ maxOrder: number | null }> = await this.dataSource.query(
      `SELECT MAX(thu_tu) AS maxOrder FROM yeu_cau_doi_tra_asset WHERE yeu_cau_id = ?`,
      [returnRequestId],
    );
    const sortOrder = (maxRow?.maxOrder ?? -1) + 1;

    const asset = this.assetRepo.create({ returnRequestId, assetId, loaiAsset, sortOrder });
    await this.assetRepo.save(asset);
    return this.queryService.getReturnAssets(returnRequestId);
  }

  private async getReturnWindowDays(): Promise<number> {
    const [config] = await this.dataSource.query(
      `SELECT config_value FROM site_config WHERE config_key = 'return_window_days' LIMIT 1`,
    );
    return config ? parseInt(config.config_value, 10) : DEFAULT_RETURN_WINDOW_DAYS;
  }
}
