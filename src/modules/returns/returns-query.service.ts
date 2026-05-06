import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ReturnRequest } from './entities/return-request.entity';
import { ReturnAsset } from './entities/return-asset.entity';
import { QueryReturnsDto } from './dto/query-returns.dto';
import { ReturnAssetResponseDto, ReturnRequestResponseDto } from './dto/return-response.dto';

@Injectable()
export class ReturnsQueryService {
  constructor(
    @InjectRepository(ReturnRequest)
    private readonly returnRepo: Repository<ReturnRequest>,
    @InjectRepository(ReturnAsset)
    private readonly assetRepo: Repository<ReturnAsset>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: QueryReturnsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const params: unknown[] = [];
    const whereClause = query.status ? (params.push(query.status), 'WHERE r.trang_thai = ?') : '';

    const rows: Array<{
      id: number; orderId: number; orderCode: string | null; customerId: number;
      customerName: string | null; requestType: string; reason: string; status: string;
      resolution: string | null; processedById: number | null; processedByName: string | null;
      returnReceivedAt: Date | null; createdAt: Date; itemCount: string;
    }> = await this.dataSource.query(
      `SELECT r.yeu_cau_id AS id, r.don_hang_id AS orderId, dh.ma_don_hang AS orderCode,
              r.khach_hang_id AS customerId,
              kh.ho_ten AS customerName, r.loai_yeu_cau AS requestType, r.ly_do AS reason,
              r.trang_thai AS status, r.huong_xu_ly AS resolution,
              r.nhan_vien_xu_ly_id AS processedById, nv.ho_ten AS processedByName,
              r.ngay_nhan_hang_hoan_tra AS returnReceivedAt,
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
        id: r.id, orderId: r.orderId, orderCode: r.orderCode ?? null,
        customerId: r.customerId, customerName: r.customerName ?? null,
        requestType: r.requestType, reason: r.reason, status: r.status,
        resolution: r.resolution ?? null, processedById: r.processedById ?? null,
        processedByName: r.processedByName ?? null,
        returnReceivedAt: r.returnReceivedAt
          ? (r.returnReceivedAt instanceof Date ? r.returnReceivedAt : new Date(r.returnReceivedAt)).toISOString()
          : null,
        itemCount: Number(r.itemCount),
        requestedAt: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString(),
      })),
      total: Number(total),
      page,
      limit,
    };
  }

  async findOne(id: number) {
    const [req]: Array<{
      id: number; orderId: number; orderCode: string | null; customerId: number;
      customerName: string | null; requestType: string; reason: string;
      description: string | null; status: string; resolution: string | null;
      inspectionResult: string | null; processedById: number | null; processedByName: string | null;
      returnTrackingCode: string | null; returnCarrier: string | null;
      returnReceivedAt: Date | null; returnReceivedById: number | null; returnReceivedByName: string | null;
      rejectTrackingCode: string | null; rejectCarrier: string | null;
      rejectNotes: string | null; rejectedAt: Date | null; rejectedByName: string | null;
      approvedAt: Date | null; inspectedAt: Date | null; processingStartedAt: Date | null;
      createdAt: Date; updatedAt: Date;
    }> = await this.dataSource.query(
      `SELECT r.yeu_cau_id AS id, r.don_hang_id AS orderId, dh.ma_don_hang AS orderCode,
              r.khach_hang_id AS customerId,
              kh.ho_ten AS customerName, r.loai_yeu_cau AS requestType, r.ly_do AS reason,
              r.mo_ta_chi_tiet AS description, r.trang_thai AS status,
              r.huong_xu_ly AS resolution, r.ket_qua_kiem_tra AS inspectionResult,
              r.nhan_vien_xu_ly_id AS processedById, nv.ho_ten AS processedByName,
              r.ma_van_don_hoan_tra AS returnTrackingCode, r.don_vi_vc_hoan_tra AS returnCarrier,
              r.ngay_nhan_hang_hoan_tra AS returnReceivedAt,
              r.nv_xac_nhan_nhan_hang_id AS returnReceivedById, nv2.ho_ten AS returnReceivedByName,
              r.reject_tracking_code AS rejectTrackingCode, r.reject_carrier AS rejectCarrier,
              r.reject_notes AS rejectNotes, r.rejected_at AS rejectedAt, nv3.ho_ten AS rejectedByName,
              r.ngay_duyet AS approvedAt, r.ngay_kiem_tra AS inspectedAt,
              r.ngay_bat_dau_xu_ly AS processingStartedAt,
              r.ngay_tao AS createdAt, r.ngay_cap_nhat AS updatedAt
       FROM yeu_cau_doi_tra r
       LEFT JOIN don_hang dh ON dh.don_hang_id = r.don_hang_id
       LEFT JOIN khach_hang kh ON kh.khach_hang_id = r.khach_hang_id
       LEFT JOIN nhan_vien nv ON nv.nhan_vien_id = r.nhan_vien_xu_ly_id
       LEFT JOIN nhan_vien nv2 ON nv2.nhan_vien_id = r.nv_xac_nhan_nhan_hang_id
       LEFT JOIN nhan_vien nv3 ON nv3.nhan_vien_id = r.rejected_by_id
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
      ngayGuiHangBaoHanh: Date | null; trackingGuiNhaSanXuat: string | null;
      carrierGuiNhaSanXuat: string | null; ngayNhanHangVe: Date | null;
      ketQuaBaoHanh: string | null; trackingDoiHang: string | null; carrierDoiHang: string | null;
      trackingTraKhach: string | null; carrierTraKhach: string | null;
      defectiveHandling: string | null; defectiveHandledAt: Date | null;
      defectiveHandledById: number | null; defectiveNotes: string | null; ngayTao: Date;
    }> = await this.dataSource.query(
      `SELECT xu_ly_id AS id, huong_xu_ly AS huongXuLy, trang_thai AS trangThai,
              so_tien_hoan AS soTienHoan, phuong_thuc_hoan AS phuongThucHoan,
              ma_bao_hanh_hang AS maBaoHanhHang,
              ngay_gui_hang_bao_hanh AS ngayGuiHangBaoHanh,
              tracking_gui_nha_sx AS trackingGuiNhaSanXuat,
              carrier_gui_nha_sx AS carrierGuiNhaSanXuat,
              ngay_nhan_hang_ve AS ngayNhanHangVe,
              ket_qua_bao_hanh AS ketQuaBaoHanh,
              tracking_doi_hang AS trackingDoiHang,
              carrier_doi_hang AS carrierDoiHang,
              tracking_tra_khach AS trackingTraKhach,
              carrier_tra_khach AS carrierTraKhach,
              xu_ly_hang_loi AS defectiveHandling,
              ngay_xu_ly_hang_loi AS defectiveHandledAt,
              nv_xu_ly_hang_loi_id AS defectiveHandledById,
              ghi_chu_hang_loi AS defectiveNotes,
              ngay_tao AS ngayTao
       FROM doi_tra_xu_ly WHERE yeu_cau_doi_tra_id = ? LIMIT 1`,
      [id],
    );

    const toISO = (d: Date | null | undefined) =>
      d ? (d instanceof Date ? d : new Date(d)).toISOString() : undefined;

    return {
      id: req.id, orderId: req.orderId, orderCode: req.orderCode ?? undefined,
      customerId: req.customerId, customerName: req.customerName ?? null,
      requestType: req.requestType, reason: req.reason,
      description: req.description ?? undefined, status: req.status,
      resolution: req.resolution ?? undefined, inspectionResult: req.inspectionResult ?? undefined,
      processedById: req.processedById ?? undefined, processedByName: req.processedByName ?? undefined,
      returnTrackingCode: req.returnTrackingCode ?? undefined,
      returnCarrier: req.returnCarrier ?? undefined,
      returnReceivedAt: toISO(req.returnReceivedAt),
      returnReceivedById: req.returnReceivedById ?? undefined,
      returnReceivedByName: req.returnReceivedByName ?? undefined,
      rejectTrackingCode: req.rejectTrackingCode ?? undefined,
      rejectCarrier: req.rejectCarrier ?? undefined,
      rejectNotes: req.rejectNotes ?? undefined,
      rejectedAt: toISO(req.rejectedAt), rejectedByName: req.rejectedByName ?? undefined,
      approvedAt: toISO(req.approvedAt), inspectedAt: toISO(req.inspectedAt),
      processingStartedAt: toISO(req.processingStartedAt),
      requestedAt: (req.createdAt instanceof Date ? req.createdAt : new Date(req.createdAt)).toISOString(),
      updatedAt: (req.updatedAt instanceof Date ? req.updatedAt : new Date(req.updatedAt)).toISOString(),
      lineItems: items.map((item) => ({
        id: String(item.id),
        productId: item.productId != null ? String(item.productId) : undefined,
        variantId: String(item.phienBanId),
        variantName: item.variantName ?? '',
        productName: item.productName ?? '',
        sku: item.sku ?? undefined,
        thumbnailUrl: item.thumbnailUrl ?? undefined,
        quantity: item.soLuong,
        refundedQty: 0,
      })),
      resolutionRecord: resolution ? {
        id: String(resolution.id),
        resolution: resolution.huongXuLy, status: resolution.trangThai,
        soTienHoan: resolution.soTienHoan ?? undefined,
        phuongThucHoan: resolution.phuongThucHoan ?? undefined,
        maBaoHanhHang: resolution.maBaoHanhHang ?? undefined,
        ngayGuiHangBaoHanh: toISO(resolution.ngayGuiHangBaoHanh),
        trackingGuiNhaSanXuat: resolution.trackingGuiNhaSanXuat ?? undefined,
        carrierGuiNhaSanXuat: resolution.carrierGuiNhaSanXuat ?? undefined,
        ngayNhanHangVe: toISO(resolution.ngayNhanHangVe),
        ketQuaBaoHanh: resolution.ketQuaBaoHanh ?? undefined,
        trackingDoiHang: resolution.trackingDoiHang ?? undefined,
        carrierDoiHang: resolution.carrierDoiHang ?? undefined,
        trackingTraKhach: resolution.trackingTraKhach ?? undefined,
        carrierTraKhach: resolution.carrierTraKhach ?? undefined,
        defectiveHandling: resolution.defectiveHandling ?? undefined,
        defectiveHandledAt: toISO(resolution.defectiveHandledAt),
        defectiveHandledById: resolution.defectiveHandledById ?? undefined,
        defectiveNotes: resolution.defectiveNotes ?? undefined,
        createdAt: toISO(resolution.ngayTao)!,
      } : undefined,
    };
  }

  async getMyReturns(customerId: number, query: QueryReturnsDto) {
    const qb = this.returnRepo.createQueryBuilder('r')
      .where('r.customerId = :customerId', { customerId });
    if (query.status) qb.andWhere('r.status = :status', { status: query.status });
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await qb
      .orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items: items.map((r) => this.toDto(r)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getReturnAssets(returnRequestId: number): Promise<ReturnAssetResponseDto[]> {
    const rows: Array<{
      id: number; returnRequestId: number; assetId: number; sortOrder: number;
      assetUrl: string | null; loaiAsset: string;
    }> = await this.dataSource.query(
      `SELECT a.id, a.yeu_cau_id AS returnRequestId, a.asset_id AS assetId,
              a.thu_tu AS sortOrder, ma.url_goc AS assetUrl, a.loai_asset AS loaiAsset
       FROM yeu_cau_doi_tra_asset a
       LEFT JOIN media_asset ma ON ma.asset_id = a.asset_id
       WHERE a.yeu_cau_id = ?
       ORDER BY a.thu_tu ASC`,
      [returnRequestId],
    );
    return rows.map((r) => ({
      id: r.id, returnRequestId: r.returnRequestId, assetId: r.assetId,
      sortOrder: r.sortOrder, assetUrl: r.assetUrl ?? undefined,
      loaiAsset: r.loaiAsset ?? 'customer_evidence',
    }));
  }

  toDto(r: ReturnRequest): ReturnRequestResponseDto {
    return {
      id: r.id, orderId: r.orderId, customerId: r.customerId,
      requestType: r.requestType, reason: r.reason,
      description: r.description, status: r.status,
      processedById: r.processedById, inspectionResult: r.inspectionResult,
      resolution: r.resolution,
      returnTrackingCode: r.returnTrackingCode ?? null,
      returnCarrier: r.returnCarrier ?? null,
      returnReceivedAt: r.returnReceivedAt ?? null,
      returnReceivedById: r.returnReceivedById ?? null,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
    };
  }
}
