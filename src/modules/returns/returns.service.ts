import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ReturnRequest } from './entities/return-request.entity';
import { ReturnAsset } from './entities/return-asset.entity';
import { ReturnRequestItem } from './entities/return-request-item.entity';
import { ReturnResolution } from './entities/return-resolution.entity';
import { CreateReturnDto } from './dto/create-return.dto';
import { ProcessReturnDto } from './dto/process-return.dto';
import { QueryReturnsDto } from './dto/query-returns.dto';
import {
  ProcessRefundResolutionDto,
  ProcessExchangeResolutionDto,
  ProcessWarrantyReturnDto,
  UpdateWarrantyStatusDto,
} from './dto/process-resolution.dto';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { ReturnAssetResponseDto, ReturnRequestResponseDto } from './dto/return-response.dto';

const DEFAULT_RETURN_WINDOW_DAYS = 7;

@Injectable()
export class ReturnsService {
  constructor(
    @InjectRepository(ReturnRequest)
    private readonly returnRepo: Repository<ReturnRequest>,
    @InjectRepository(ReturnAsset)
    private readonly assetRepo: Repository<ReturnAsset>,
    @InjectRepository(ReturnRequestItem)
    private readonly returnItemRepo: Repository<ReturnRequestItem>,
    @InjectRepository(ReturnResolution)
    private readonly resolutionRepo: Repository<ReturnResolution>,
    private readonly loyaltyService: LoyaltyService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Customer ─────────────────────────────────────────────────────────────

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
    if (existing) {
      throw new BadRequestException('Đơn hàng này đã có yêu cầu đổi/trả đang chờ duyệt');
    }

    if (dto.requestType === 'TraHang' && (!dto.items || dto.items.length === 0)) {
      throw new BadRequestException('Yêu cầu trả hàng phải chỉ định ít nhất một sản phẩm');
    }

    if (dto.requestType === 'BaoHanh' && dto.items && dto.items.length > 0) {
      const deliveredAt = new Date(order.ngay_cap_nhat);
      for (const item of dto.items) {
        const [variant]: Array<{ thoi_gian_bao_hanh: number | null }> = await this.dataSource.query(
          `SELECT thoi_gian_bao_hanh FROM phien_ban_san_pham WHERE phien_ban_id = ?`,
          [item.variantId],
        );
        if (variant?.thoi_gian_bao_hanh !== null && variant?.thoi_gian_bao_hanh !== undefined) {
          const ngayHetBaoHanh = new Date(deliveredAt);
          ngayHetBaoHanh.setMonth(ngayHetBaoHanh.getMonth() + variant.thoi_gian_bao_hanh);
          if (new Date() > ngayHetBaoHanh) {
            const formatted = ngayHetBaoHanh.toLocaleDateString('vi-VN');
            throw new BadRequestException(
              `Sản phẩm ID ${item.variantId} đã hết hạn bảo hành (${formatted})`,
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
          throw new BadRequestException(`Phiên bản ${item.variantId}: số lượng yêu cầu (${item.quantity}) vượt quá số lượng đã đặt (${orderedQty})`);
        }
      }
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const returnReq = manager.create(ReturnRequest, {
        orderId: dto.orderId,
        customerId,
        requestType: dto.requestType,
        reason: dto.reason,
        description: dto.description ?? null,
        status: 'ChoDuyet',
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
            yeuCauId: result.id,
            phienBanId: item.variantId,
            soLuong: item.quantity,
          }),
        );
        await manager.save(items);
      }

      return result;
    });

    return this.toDto(saved);
  }

  async getMyReturns(customerId: number, query: QueryReturnsDto) {
    const qb = this.returnRepo.createQueryBuilder('r')
      .where('r.customerId = :customerId', { customerId });

    if (query.status) {
      qb.andWhere('r.status = :status', { status: query.status });
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await qb
      .orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: items.map((r) => this.toDto(r)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async findAll(query: QueryReturnsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const params: unknown[] = [];
    const whereClause = query.status ? (params.push(query.status), 'WHERE r.trang_thai = ?') : '';

    const rows: Array<{
      id: number; orderId: number; orderCode: string | null; customerId: number; customerName: string | null;
      requestType: string; reason: string; status: string; resolution: string | null;
      processedById: number | null; processedByName: string | null;
      createdAt: Date; itemCount: string;
    }> = await this.dataSource.query(
      `SELECT r.yeu_cau_id AS id, r.don_hang_id AS orderId, dh.ma_don_hang AS orderCode,
              r.khach_hang_id AS customerId,
              kh.ho_ten AS customerName, r.loai_yeu_cau AS requestType, r.ly_do AS reason,
              r.trang_thai AS status, r.huong_xu_ly AS resolution,
              r.nhan_vien_xu_ly_id AS processedById, nv.ho_ten AS processedByName,
              r.ngay_tao AS createdAt,
              (SELECT COUNT(*) FROM yeu_cau_doi_tra_chi_tiet ct WHERE ct.yeu_cau_id = r.yeu_cau_id) AS itemCount
       FROM yeu_cau_doi_tra r
       LEFT JOIN khach_hang kh ON kh.khach_hang_id = r.khach_hang_id
       LEFT JOIN nhan_vien nv ON nv.nhan_vien_id = r.nhan_vien_xu_ly_id
       LEFT JOIN don_hang dh ON dh.don_hang_id = r.don_hang_id
       ${whereClause}
       ORDER BY r.ngay_tao DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const [{ total }]: [{ total: string }] = await this.dataSource.query(
      `SELECT COUNT(*) AS total FROM yeu_cau_doi_tra r ${whereClause}`,
      params,
    );

    return {
      items: rows.map((r) => ({
        id:              r.id,
        orderId:         r.orderId,
        orderCode:       r.orderCode ?? null,
        customerId:      r.customerId,
        customerName:    r.customerName ?? null,
        requestType:     r.requestType,
        reason:          r.reason,
        status:          r.status,
        resolution:      r.resolution ?? null,
        processedById:   r.processedById ?? null,
        processedByName: r.processedByName ?? null,
        itemCount:       Number(r.itemCount),
        requestedAt:     (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString(),
      })),
      total: Number(total),
      page,
      limit,
    };
  }

  async findOne(id: number) {
    const [req]: Array<{
      id: number; orderId: number; orderCode: string | null; customerId: number; customerName: string | null;
      requestType: string; reason: string; description: string | null;
      status: string; resolution: string | null; inspectionResult: string | null;
      processedById: number | null; processedByName: string | null;
      createdAt: Date; updatedAt: Date;
    }> = await this.dataSource.query(
      `SELECT r.yeu_cau_id AS id, r.don_hang_id AS orderId, dh.ma_don_hang AS orderCode,
              r.khach_hang_id AS customerId,
              kh.ho_ten AS customerName, r.loai_yeu_cau AS requestType, r.ly_do AS reason,
              r.mo_ta_chi_tiet AS description, r.trang_thai AS status,
              r.huong_xu_ly AS resolution, r.ket_qua_kiem_tra AS inspectionResult,
              r.nhan_vien_xu_ly_id AS processedById, nv.ho_ten AS processedByName,
              r.ngay_tao AS createdAt, r.ngay_cap_nhat AS updatedAt
       FROM yeu_cau_doi_tra r
       LEFT JOIN don_hang dh ON dh.don_hang_id = r.don_hang_id
       LEFT JOIN khach_hang kh ON kh.khach_hang_id = r.khach_hang_id
       LEFT JOIN nhan_vien nv ON nv.nhan_vien_id = r.nhan_vien_xu_ly_id
       WHERE r.yeu_cau_id = ?`,
      [id],
    );
    if (!req) throw new NotFoundException(`Yêu cầu đổi/trả #${id} không tồn tại`);

    const items: Array<{
      id: number; phienBanId: number; productId: number | null; variantName: string | null;
      productName: string | null; sku: string | null; thumbnailUrl: string | null; soLuong: number;
    }> = await this.dataSource.query(
      `SELECT ct.chi_tiet_yc_id AS id, ct.phien_ban_id AS phienBanId,
              sp.san_pham_id AS productId,
              pbsp.ten_phien_ban AS variantName, sp.ten_san_pham AS productName,
              pbsp.sku AS sku,
              (SELECT url_hinh_anh FROM hinh_anh_san_pham
               WHERE phien_ban_id = ct.phien_ban_id ORDER BY thu_tu ASC LIMIT 1) AS thumbnailUrl,
              ct.so_luong AS soLuong
       FROM yeu_cau_doi_tra_chi_tiet ct
       LEFT JOIN phien_ban_san_pham pbsp ON pbsp.phien_ban_id = ct.phien_ban_id
       LEFT JOIN san_pham sp ON sp.san_pham_id = pbsp.san_pham_id
       WHERE ct.yeu_cau_id = ?`,
      [id],
    );

    const [resolution]: Array<{
      id: number; huongXuLy: string; trangThai: string; soTienHoan: number | null;
      phuongThucHoan: string | null; maBaoHanhHang: string | null;
      ngayGuiHangBaoHanh: Date | null; ngayNhanHangVe: Date | null;
      ketQuaBaoHanh: string | null; ngayTao: Date;
    }> = await this.dataSource.query(
      `SELECT xu_ly_id AS id, huong_xu_ly AS huongXuLy, trang_thai AS trangThai,
              so_tien_hoan AS soTienHoan, phuong_thuc_hoan AS phuongThucHoan,
              ma_bao_hanh_hang AS maBaoHanhHang,
              ngay_gui_hang_bao_hanh AS ngayGuiHangBaoHanh,
              ngay_nhan_hang_ve AS ngayNhanHangVe,
              ket_qua_bao_hanh AS ketQuaBaoHanh,
              ngay_tao AS ngayTao
       FROM doi_tra_xu_ly WHERE yeu_cau_doi_tra_id = ? LIMIT 1`,
      [id],
    );

    const toISO = (d: Date | null | undefined) =>
      d ? (d instanceof Date ? d : new Date(d)).toISOString() : undefined;

    return {
      id:              req.id,
      orderId:         req.orderId,
      orderCode:       req.orderCode ?? undefined,
      customerId:      req.customerId,
      customerName:    req.customerName ?? null,
      requestType:     req.requestType,
      reason:          req.reason,
      description:     req.description ?? undefined,
      status:          req.status,
      resolution:      req.resolution ?? undefined,
      inspectionResult: req.inspectionResult ?? undefined,
      processedById:   req.processedById ?? undefined,
      processedByName: req.processedByName ?? undefined,
      requestedAt:     (req.createdAt instanceof Date ? req.createdAt : new Date(req.createdAt)).toISOString(),
      updatedAt:       (req.updatedAt instanceof Date ? req.updatedAt : new Date(req.updatedAt)).toISOString(),
      lineItems: items.map((item) => ({
        id:           String(item.id),
        productId:    item.productId != null ? String(item.productId) : undefined,
        variantId:    String(item.phienBanId),
        variantName:  item.variantName ?? '',
        productName:  item.productName ?? '',
        sku:          item.sku ?? undefined,
        thumbnailUrl: item.thumbnailUrl ?? undefined,
        quantity:     item.soLuong,
        refundedQty:  0,
      })),
      resolutionRecord: resolution ? {
        id:                   String(resolution.id),
        resolution:           resolution.huongXuLy,
        status:               resolution.trangThai,
        soTienHoan:           resolution.soTienHoan ?? undefined,
        phuongThucHoan:       resolution.phuongThucHoan ?? undefined,
        maBaoHanhHang:        resolution.maBaoHanhHang ?? undefined,
        ngayGuiHangBaoHanh:   toISO(resolution.ngayGuiHangBaoHanh),
        ngayNhanHangVe:       toISO(resolution.ngayNhanHangVe),
        ketQuaBaoHanh:        resolution.ketQuaBaoHanh ?? undefined,
        createdAt:            toISO(resolution.ngayTao)!,
      } : undefined,
    };
  }

  async processReturn(id: number, dto: ProcessReturnDto, employeeId: number): Promise<ReturnRequestResponseDto> {
    const returnReq = await this.returnRepo.findOne({ where: { id } });
    if (!returnReq) throw new NotFoundException(`Yêu cầu đổi/trả #${id} không tồn tại`);

    returnReq.status = dto.status;
    returnReq.processedById = employeeId;
    if (dto.inspectionResult) returnReq.inspectionResult = dto.inspectionResult;
    if (dto.resolution) returnReq.resolution = dto.resolution;

    const saved = await this.returnRepo.save(returnReq);
    return this.toDto(saved);
  }

  async getReturnAssets(returnRequestId: number): Promise<ReturnAssetResponseDto[]> {
    const rows: Array<{
      id: number; returnRequestId: number; assetId: number; sortOrder: number; assetUrl: string | null;
    }> = await this.dataSource.query(
      `SELECT a.id, a.yeu_cau_id AS returnRequestId, a.asset_id AS assetId,
              a.thu_tu AS sortOrder, ma.url_goc AS assetUrl
       FROM yeu_cau_doi_tra_asset a
       LEFT JOIN media_asset ma ON ma.asset_id = a.asset_id
       WHERE a.yeu_cau_id = ?
       ORDER BY a.thu_tu ASC`,
      [returnRequestId],
    );
    return rows.map((r) => ({
      id:              r.id,
      returnRequestId: r.returnRequestId,
      assetId:         r.assetId,
      sortOrder:       r.sortOrder,
      assetUrl:        r.assetUrl ?? undefined,
    }));
  }

  // ─── Resolution: HoanTien ─────────────────────────────────────────────────

  async processRefund(returnRequestId: number, dto: ProcessRefundResolutionDto, employeeId: number) {
    const returnReq = await this.returnRepo.findOne({ where: { id: returnRequestId } });
    if (!returnReq) throw new NotFoundException(`Yêu cầu đổi/trả #${returnRequestId} không tồn tại`);
    if (!['DaDuyet', 'DangXuLy'].includes(returnReq.status)) {
      throw new BadRequestException('Yêu cầu phải ở trạng thái DaDuyet hoặc DangXuLy để xử lý hoàn tiền');
    }

    const returnItems = await this.returnItemRepo.find({ where: { yeuCauId: returnRequestId } });
    if (!returnItems.length) {
      throw new BadRequestException('Yêu cầu không có sản phẩm nào để hoàn trả');
    }

    return this.dataSource.transaction(async (manager) => {
      // Update original transaction to DaHoan
      const [giaoDich]: Array<{ giao_dich_id: number }> = await manager.query(
        `SELECT giao_dich_id FROM giao_dich WHERE don_hang_id = ? LIMIT 1`,
        [returnReq.orderId],
      );
      if (giaoDich) {
        await manager.query(
          `UPDATE giao_dich SET trang_thai_giao_dich = 'DaHoan' WHERE giao_dich_id = ?`,
          [giaoDich.giao_dich_id],
        );
      }

      // Update order payment status
      await manager.query(
        `UPDATE don_hang SET trang_thai_thanh_toan = 'DaHoan' WHERE don_hang_id = ?`,
        [returnReq.orderId],
      );

      // Restore stock for each return item
      for (const item of returnItems) {
        await manager.query(
          `INSERT INTO lich_su_nhap_xuat
             (phien_ban_id, loai_giao_dich, so_luong, phieu_nhap_id, nguoi_thuc_hien_id, ghi_chu)
           VALUES (?, 'HoanTra', ?, ?, ?, ?)`,
          [item.phienBanId, item.soLuong, dto.phieuNhapKhoId ?? null, employeeId, `Hoàn tiền yêu cầu #${returnRequestId}`],
        );
        await manager.query(
          `UPDATE ton_kho SET so_luong_ton = so_luong_ton + ? WHERE phien_ban_id = ?`,
          [item.soLuong, item.phienBanId],
        );
      }

      // Create resolution record
      const resolution = manager.create(ReturnResolution, {
        yeuCauDoiTraId: returnRequestId,
        huongXuLy: 'HoanTien',
        trangThai: 'HoanThanh',
        phieuNhapKhoId: dto.phieuNhapKhoId ?? null,
        soTienHoan: dto.soTienHoan,
        phuongThucHoan: dto.phuongThucHoan,
        giaoDichHoanId: giaoDich?.giao_dich_id ?? null,
        maGiaoDichHoan: dto.maGiaoDichHoan ?? null,
        nganHangViHoan: dto.nganHangViHoan ?? null,
        thoiDiemHoan: new Date(),
        nguoiXuLyId: employeeId,
        ghiChu: dto.ghiChu ?? null,
      });
      await manager.save(resolution);

      // Mark return request as completed
      await manager.query(
        `UPDATE yeu_cau_doi_tra SET trang_thai = 'HoanThanh' WHERE yeu_cau_id = ?`,
        [returnRequestId],
      );

      // Deduct loyalty points if applicable
      const [loyaltyRow]: Array<{ diem: number }> = await manager.query(
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

      return { resolutionId: resolution.id, status: 'HoanThanh' };
    });
  }

  // ─── Resolution: GiaoHangMoi ──────────────────────────────────────────────

  async processExchange(returnRequestId: number, dto: ProcessExchangeResolutionDto, employeeId: number) {
    const returnReq = await this.returnRepo.findOne({ where: { id: returnRequestId } });
    if (!returnReq) throw new NotFoundException(`Yêu cầu đổi/trả #${returnRequestId} không tồn tại`);
    if (!['DaDuyet', 'DangXuLy'].includes(returnReq.status)) {
      throw new BadRequestException('Yêu cầu phải ở trạng thái DaDuyet hoặc DangXuLy để xử lý đổi hàng');
    }

    const returnItems = await this.returnItemRepo.find({ where: { yeuCauId: returnRequestId } });
    if (!returnItems.length) {
      throw new BadRequestException('Yêu cầu không có sản phẩm nào để đổi');
    }

    // Fetch original order data for cloning
    const [originalOrder]: Array<{
      khach_hang_id: number;
      dia_chi_giao_hang_id: number;
      phuong_thuc_van_chuyen: string;
    }> = await this.dataSource.query(
      `SELECT khach_hang_id, dia_chi_giao_hang_id, phuong_thuc_van_chuyen FROM don_hang WHERE don_hang_id = ?`,
      [returnReq.orderId],
    );
    if (!originalOrder) throw new BadRequestException('Đơn hàng gốc không tồn tại');

    // Get snapshot data for exchange order items
    const snapshotItems: Array<{
      phien_ban_id: number;
      gia_tai_thoi_diem: string;
      ten_san_pham_snapshot: string;
      sku_snapshot: string;
    }> = await this.dataSource.query(
      `SELECT phien_ban_id, gia_tai_thoi_diem, ten_san_pham_snapshot, sku_snapshot
       FROM chi_tiet_don_hang WHERE don_hang_id = ? AND phien_ban_id IN (?)`,
      [returnReq.orderId, returnItems.map((i) => i.phienBanId)],
    );
    const snapshotMap = new Map(snapshotItems.map((r) => [r.phien_ban_id, r]));

    return this.dataSource.transaction(async (manager) => {
      // Create new exchange order (tong_thanh_toan = 0, không thu tiền)
      const exchangeCode = `EXCH-${returnRequestId}-${Date.now()}`;
      const orderInsert: { insertId: number } = await manager.query(
        `INSERT INTO don_hang
           (ma_don_hang, khach_hang_id, dia_chi_giao_hang_id, trang_thai_don,
            phuong_thuc_van_chuyen, tong_tien_hang, tong_thanh_toan, ghi_chu_khach)
         VALUES (?, ?, ?, 'DaXacNhan', ?, 0, 0, ?)`,
        [
          exchangeCode,
          originalOrder.khach_hang_id,
          originalOrder.dia_chi_giao_hang_id,
          originalOrder.phuong_thuc_van_chuyen,
          `Đơn đổi hàng cho YC#${returnRequestId}`,
        ],
      );
      const newOrderId = orderInsert.insertId;

      // Insert exchange order items and deduct stock
      for (const item of returnItems) {
        const snap = snapshotMap.get(item.phienBanId);
        const price = snap ? Number(snap.gia_tai_thoi_diem) : 0;
        await manager.query(
          `INSERT INTO chi_tiet_don_hang
             (don_hang_id, phien_ban_id, so_luong, gia_tai_thoi_diem, thanh_tien,
              ten_san_pham_snapshot, sku_snapshot)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            newOrderId,
            item.phienBanId,
            item.soLuong,
            price,
            price * item.soLuong,
            snap?.ten_san_pham_snapshot ?? '',
            snap?.sku_snapshot ?? '',
          ],
        );

        await manager.query(
          `INSERT INTO lich_su_nhap_xuat
             (phien_ban_id, loai_giao_dich, so_luong, don_hang_id, nguoi_thuc_hien_id, ghi_chu)
           VALUES (?, 'Xuat', ?, ?, ?, ?)`,
          [item.phienBanId, item.soLuong, newOrderId, employeeId, `Đổi hàng yêu cầu #${returnRequestId}`],
        );
        await manager.query(
          `UPDATE ton_kho SET so_luong_ton = so_luong_ton - ? WHERE phien_ban_id = ?`,
          [item.soLuong, item.phienBanId],
        );
      }

      // Create resolution record
      const resolution = manager.create(ReturnResolution, {
        yeuCauDoiTraId: returnRequestId,
        huongXuLy: 'GiaoHangMoi',
        trangThai: 'DangXuLy',
        phieuNhapKhoId: dto.phieuNhapKhoId ?? null,
        donHangDoiId: newOrderId,
        trackingDoiHang: dto.trackingDoiHang ?? null,
        carrierDoiHang: dto.carrierDoiHang ?? null,
        nguoiXuLyId: employeeId,
        ghiChu: dto.ghiChu ?? null,
      });
      await manager.save(resolution);

      // Mark return request as in progress
      await manager.query(
        `UPDATE yeu_cau_doi_tra SET trang_thai = 'DangXuLy' WHERE yeu_cau_id = ?`,
        [returnRequestId],
      );

      return { resolutionId: resolution.id, exchangeOrderId: newOrderId, exchangeOrderCode: exchangeCode };
    });
  }

  async confirmExchangeDelivered(resolutionId: number, employeeId: number) {
    const resolution = await this.resolutionRepo.findOne({ where: { id: resolutionId } });
    if (!resolution) throw new NotFoundException(`Bản ghi xử lý #${resolutionId} không tồn tại`);
    if (resolution.huongXuLy !== 'GiaoHangMoi') {
      throw new BadRequestException('Bản ghi xử lý không phải loại đổi hàng');
    }
    if (resolution.trangThai === 'HoanThanh') {
      throw new BadRequestException('Đã hoàn thành xử lý rồi');
    }

    await this.dataSource.transaction(async (manager) => {
      if (resolution.donHangDoiId) {
        await manager.query(
          `UPDATE don_hang SET trang_thai_don = 'DaGiao' WHERE don_hang_id = ?`,
          [resolution.donHangDoiId],
        );
      }
      await manager.query(
        `UPDATE doi_tra_xu_ly SET trang_thai = 'HoanThanh' WHERE xu_ly_id = ?`,
        [resolutionId],
      );
      await manager.query(
        `UPDATE yeu_cau_doi_tra SET trang_thai = 'HoanThanh' WHERE yeu_cau_id = ?`,
        [resolution.yeuCauDoiTraId],
      );
    });

    return { resolutionId, status: 'HoanThanh' };
  }

  // ─── Resolution: BaoHanh ──────────────────────────────────────────────────

  async initWarrantyResolution(returnRequestId: number, phieuNhapKhoId: number | null, employeeId: number) {
    const returnReq = await this.returnRepo.findOne({ where: { id: returnRequestId } });
    if (!returnReq) throw new NotFoundException(`Yêu cầu đổi/trả #${returnRequestId} không tồn tại`);
    if (!['DaDuyet', 'DangXuLy'].includes(returnReq.status)) {
      throw new BadRequestException('Yêu cầu phải ở trạng thái DaDuyet hoặc DangXuLy');
    }

    const existing = await this.resolutionRepo.findOne({ where: { yeuCauDoiTraId: returnRequestId } });
    if (existing) return existing;

    const resolution = this.resolutionRepo.create({
      yeuCauDoiTraId: returnRequestId,
      huongXuLy: 'BaoHanh',
      trangThai: 'DangXuLy',
      phieuNhapKhoId: phieuNhapKhoId ?? null,
      nguoiXuLyId: employeeId,
    });
    await this.resolutionRepo.save(resolution);

    await this.dataSource.query(
      `UPDATE yeu_cau_doi_tra SET trang_thai = 'DangXuLy' WHERE yeu_cau_id = ?`,
      [returnRequestId],
    );

    return resolution;
  }

  async updateWarrantyStatus(resolutionId: number, dto: UpdateWarrantyStatusDto) {
    const resolution = await this.resolutionRepo.findOne({ where: { id: resolutionId } });
    if (!resolution) throw new NotFoundException(`Bản ghi xử lý #${resolutionId} không tồn tại`);
    if (resolution.huongXuLy !== 'BaoHanh') {
      throw new BadRequestException('Bản ghi xử lý không phải loại bảo hành');
    }

    if (dto.maBaoHanhHang !== undefined) resolution.maBaoHanhHang = dto.maBaoHanhHang;
    if (dto.ngayGuiHangBaoHanh !== undefined) resolution.ngayGuiHangBaoHanh = new Date(dto.ngayGuiHangBaoHanh);
    if (dto.ngayNhanHangVe !== undefined) resolution.ngayNhanHangVe = new Date(dto.ngayNhanHangVe);
    if (dto.ketQuaBaoHanh !== undefined) resolution.ketQuaBaoHanh = dto.ketQuaBaoHanh;
    if (dto.tinhTrangHangNhan !== undefined) resolution.tinhTrangHangNhan = dto.tinhTrangHangNhan;

    return this.resolutionRepo.save(resolution);
  }

  async processWarranty(returnRequestId: number, dto: ProcessWarrantyReturnDto, employeeId: number) {
    const returnReq = await this.returnRepo.findOne({ where: { id: returnRequestId } });
    if (!returnReq) throw new NotFoundException(`Yêu cầu đổi/trả #${returnRequestId} không tồn tại`);

    const resolution = await this.resolutionRepo.findOne({ where: { yeuCauDoiTraId: returnRequestId } });
    if (!resolution) throw new BadRequestException(`Chưa khởi tạo bản ghi xử lý bảo hành cho yêu cầu #${returnRequestId}`);
    if (resolution.huongXuLy !== 'BaoHanh') {
      throw new BadRequestException('Bản ghi xử lý không phải loại bảo hành');
    }
    if (resolution.trangThai === 'HoanThanh') {
      throw new BadRequestException('Đã hoàn thành xử lý bảo hành rồi');
    }

    const returnItems = await this.returnItemRepo.find({ where: { yeuCauId: returnRequestId } });
    if (!returnItems.length) {
      throw new BadRequestException('Yêu cầu không có sản phẩm nào');
    }

    return this.dataSource.transaction(async (manager) => {
      // Deduct stock for items being returned to customer
      for (const item of returnItems) {
        await manager.query(
          `INSERT INTO lich_su_nhap_xuat
             (phien_ban_id, loai_giao_dich, so_luong, nguoi_thuc_hien_id, ghi_chu)
           VALUES (?, 'Xuat', ?, ?, ?)`,
          [item.phienBanId, item.soLuong, employeeId, `Bảo hành trả khách yêu cầu #${returnRequestId}`],
        );
        await manager.query(
          `UPDATE ton_kho SET so_luong_ton = so_luong_ton - ? WHERE phien_ban_id = ?`,
          [item.soLuong, item.phienBanId],
        );
      }

      // Update resolution
      await manager.query(
        `UPDATE doi_tra_xu_ly
         SET tracking_tra_khach = ?, trang_thai = 'HoanThanh', nguoi_xu_ly_id = ?,
             ghi_chu = COALESCE(?, ghi_chu)
         WHERE xu_ly_id = ?`,
        [dto.trackingTraKhach, employeeId, dto.ghiChu ?? null, resolution.id],
      );

      // Mark return request as completed
      await manager.query(
        `UPDATE yeu_cau_doi_tra SET trang_thai = 'HoanThanh' WHERE yeu_cau_id = ?`,
        [returnRequestId],
      );

      return { resolutionId: resolution.id, status: 'HoanThanh' };
    });
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  private async getReturnWindowDays(): Promise<number> {
    const [config] = await this.dataSource.query(
      `SELECT config_value FROM site_config WHERE config_key = 'return_window_days' LIMIT 1`,
    );
    return config ? parseInt(config.config_value, 10) : DEFAULT_RETURN_WINDOW_DAYS;
  }

  private toDto(r: ReturnRequest): ReturnRequestResponseDto {
    return {
      id: r.id,
      orderId: r.orderId,
      customerId: r.customerId,
      requestType: r.requestType,
      reason: r.reason,
      description: r.description,
      status: r.status,
      processedById: r.processedById,
      inspectionResult: r.inspectionResult,
      resolution: r.resolution,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private toAssetDto(a: ReturnAsset): ReturnAssetResponseDto {
    return {
      id: a.id,
      returnRequestId: a.returnRequestId,
      assetId: a.assetId,
      sortOrder: a.sortOrder,
    };
  }
}
