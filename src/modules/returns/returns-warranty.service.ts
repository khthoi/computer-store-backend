import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ReturnRequest } from './entities/return-request.entity';
import { ReturnRequestItem } from './entities/return-request-item.entity';
import { ReturnResolution } from './entities/return-resolution.entity';
import {
  ProcessWarrantyReturnDto, UpdateWarrantyStatusDto,
  UpdateDefectiveHandlingDto, CompleteReuseDto,
} from './dto/process-resolution.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class ReturnsWarrantyService {
  constructor(
    @InjectRepository(ReturnRequest)
    private readonly returnRepo: Repository<ReturnRequest>,
    @InjectRepository(ReturnRequestItem)
    private readonly returnItemRepo: Repository<ReturnRequestItem>,
    @InjectRepository(ReturnResolution)
    private readonly resolutionRepo: Repository<ReturnResolution>,
    private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async initWarrantyResolution(returnRequestId: number, phieuNhapKhoId: number | null, employeeId: number) {
    const returnReq = await this.returnRepo.findOne({ where: { id: returnRequestId } });
    if (!returnReq) throw new NotFoundException(`Yêu cầu đổi/trả #${returnRequestId} không tồn tại`);
    if (!['DaDuyet', 'DaNhanHang', 'DaKiemTra', 'DangXuLy'].includes(returnReq.status)) {
      throw new BadRequestException('Yêu cầu phải ở trạng thái DaDuyet, DaNhanHang, DaKiemTra hoặc DangXuLy');
    }
    if (returnReq.requestType !== 'BaoHanh') {
      throw new BadRequestException('Chỉ áp dụng cho yêu cầu bảo hành (BaoHanh)');
    }

    const existing = await this.resolutionRepo.findOne({ where: { yeuCauDoiTraId: returnRequestId } });
    if (existing) return existing;

    const resolution = this.resolutionRepo.create({
      yeuCauDoiTraId: returnRequestId, huongXuLy: 'BaoHanh', trangThai: 'DangXuLy',
      phieuNhapKhoId: phieuNhapKhoId ?? null, nguoiXuLyId: employeeId,
    });
    await this.resolutionRepo.save(resolution);

    await this.dataSource.query(
      `UPDATE yeu_cau_doi_tra SET trang_thai = 'DangXuLy', ngay_bat_dau_xu_ly = NOW() WHERE yeu_cau_id = ?`,
      [returnRequestId],
    );

    this.auditLogsService.log({
      entityType:  'DoiTraXuLy',
      entityId:    String(resolution.id),
      entityLabel: `Xử lý bảo hành — yêu cầu #${returnRequestId}`,
      actionType:  'TaoMoi',
      actionDetail: `Nhân viên #${employeeId} khởi tạo quy trình bảo hành cho yêu cầu #${returnRequestId}`,
      after: JSON.stringify({
        id:             resolution.id,
        yeuCauDoiTraId: returnRequestId,
        huongXuLy:      'BaoHanh',
        trangThai:      'DangXuLy',
        phieuNhapKhoId: phieuNhapKhoId ?? null,
        nguoiXuLyId:    employeeId,
      }),
    });
    return resolution;
  }

  async updateWarrantyStatus(resolutionId: number, dto: UpdateWarrantyStatusDto) {
    const resolution = await this.resolutionRepo.findOne({ where: { id: resolutionId } });
    if (!resolution) throw new NotFoundException(`Bản ghi xử lý #${resolutionId} không tồn tại`);
    if (resolution.huongXuLy !== 'BaoHanh') {
      throw new BadRequestException('Bản ghi xử lý không phải loại bảo hành');
    }

    const before = {
      maBaoHanhHang:          resolution.maBaoHanhHang,
      ngayGuiHangBaoHanh:     resolution.ngayGuiHangBaoHanh,
      trackingGuiNhaSanXuat:  resolution.trackingGuiNhaSanXuat,
      carrierGuiNhaSanXuat:   resolution.carrierGuiNhaSanXuat,
      ngayNhanHangVe:         resolution.ngayNhanHangVe,
      ketQuaBaoHanh:          resolution.ketQuaBaoHanh,
      tinhTrangHangNhan:      resolution.tinhTrangHangNhan,
    };

    if (dto.maBaoHanhHang !== undefined) resolution.maBaoHanhHang = dto.maBaoHanhHang;
    if (dto.ngayGuiHangBaoHanh !== undefined) resolution.ngayGuiHangBaoHanh = new Date(dto.ngayGuiHangBaoHanh);
    if (dto.trackingGuiNhaSanXuat !== undefined) resolution.trackingGuiNhaSanXuat = dto.trackingGuiNhaSanXuat;
    if (dto.carrierGuiNhaSanXuat !== undefined) resolution.carrierGuiNhaSanXuat = dto.carrierGuiNhaSanXuat;
    if (dto.ngayNhanHangVe !== undefined) resolution.ngayNhanHangVe = new Date(dto.ngayNhanHangVe);
    if (dto.ketQuaBaoHanh !== undefined) resolution.ketQuaBaoHanh = dto.ketQuaBaoHanh;
    if (dto.tinhTrangHangNhan !== undefined) resolution.tinhTrangHangNhan = dto.tinhTrangHangNhan;

    const saved = await this.resolutionRepo.save(resolution);
    this.auditLogsService.log({
      entityType:  'DoiTraXuLy',
      entityId:    String(resolutionId),
      entityLabel: `Xử lý bảo hành #${resolutionId}`,
      actionType:  'CapNhat',
      actionDetail: `Cập nhật trạng thái bảo hành cho resolution #${resolutionId}`,
      before: JSON.stringify(before),
      after: JSON.stringify({
        maBaoHanhHang:         saved.maBaoHanhHang,
        ngayGuiHangBaoHanh:    saved.ngayGuiHangBaoHanh,
        trackingGuiNhaSanXuat: saved.trackingGuiNhaSanXuat,
        carrierGuiNhaSanXuat:  saved.carrierGuiNhaSanXuat,
        ngayNhanHangVe:        saved.ngayNhanHangVe,
        ketQuaBaoHanh:         saved.ketQuaBaoHanh,
        tinhTrangHangNhan:     saved.tinhTrangHangNhan,
      }),
    });
    return saved;
  }

  async processWarranty(returnRequestId: number, dto: ProcessWarrantyReturnDto, employeeId: number) {
    const returnReq = await this.returnRepo.findOne({ where: { id: returnRequestId } });
    if (!returnReq) throw new NotFoundException(`Yêu cầu đổi/trả #${returnRequestId} không tồn tại`);

    const resolution = await this.resolutionRepo.findOne({ where: { yeuCauDoiTraId: returnRequestId } });
    if (!resolution) {
      throw new BadRequestException(`Chưa khởi tạo bản ghi xử lý bảo hành cho yêu cầu #${returnRequestId}`);
    }
    if (resolution.huongXuLy !== 'BaoHanh') {
      throw new BadRequestException('Bản ghi xử lý không phải loại bảo hành');
    }
    if (resolution.trangThai === 'HoanThanh') {
      throw new BadRequestException('Đã hoàn thành xử lý bảo hành rồi');
    }

    const returnItems = await this.returnItemRepo.find({ where: { yeuCauId: returnRequestId } });
    if (!returnItems.length) throw new BadRequestException('Yêu cầu không có sản phẩm nào');

    const statusCuReq = returnReq.status;
    const trangThaiCuResolution = resolution.trangThai;
    const result = await this.dataSource.transaction(async (manager) => {
      for (const item of returnItems) {
        await manager.query(
          `INSERT INTO lich_su_nhap_xuat (phien_ban_id, loai_giao_dich, so_luong, nguoi_thuc_hien_id, ghi_chu)
           VALUES (?, 'Xuat', ?, ?, ?)`,
          [item.phienBanId, item.soLuong, employeeId, `Bảo hành trả khách yêu cầu #${returnRequestId}`],
        );
        await manager.query(
          `UPDATE ton_kho SET so_luong_ton = so_luong_ton - ? WHERE phien_ban_id = ?`,
          [item.soLuong, item.phienBanId],
        );
      }

      await manager.query(
        `UPDATE doi_tra_xu_ly
         SET tracking_tra_khach = ?, carrier_tra_khach = ?,
             trang_thai = 'HoanThanh', nguoi_xu_ly_id = ?,
             ghi_chu = COALESCE(?, ghi_chu)
         WHERE xu_ly_id = ?`,
        [dto.trackingTraKhach, dto.carrierTraKhach, employeeId, dto.ghiChu ?? null, resolution.id],
      );
      await manager.query(
        `UPDATE yeu_cau_doi_tra SET trang_thai = 'HoanThanh' WHERE yeu_cau_id = ?`,
        [returnRequestId],
      );

      return { resolutionId: resolution.id, status: 'HoanThanh' };
    });

    this.auditLogsService.log({
      entityType:  'DoiTraXuLy',
      entityId:    String(result.resolutionId),
      entityLabel: `Xử lý bảo hành #${result.resolutionId}`,
      actionType:  'DoiTrangThai',
      actionDetail: `Nhân viên #${employeeId} hoàn tất bảo hành trả khách cho yêu cầu #${returnRequestId} (tracking: ${dto.trackingTraKhach ?? 'N/A'}, hãng: ${dto.carrierTraKhach ?? 'N/A'})`,
      before: JSON.stringify({ trangThai: trangThaiCuResolution }),
      after: JSON.stringify({
        trangThai:       'HoanThanh',
        trackingTraKhach: dto.trackingTraKhach ?? null,
        carrierTraKhach:  dto.carrierTraKhach ?? null,
        nguoiXuLyId:      employeeId,
      }),
    });
    this.auditLogsService.log({
      entityType:  'YeuCauDoiTra',
      entityId:    String(returnRequestId),
      entityLabel: `Yêu cầu đổi/trả #${returnRequestId}`,
      actionType:  'DoiTrangThai',
      actionDetail: `Yêu cầu bảo hành #${returnRequestId} hoàn tất xử lý`,
      before: JSON.stringify({ status: statusCuReq }),
      after:  JSON.stringify({ status: 'HoanThanh' }),
    });
    return result;
  }

  async updateDefectiveHandling(resolutionId: number, dto: UpdateDefectiveHandlingDto, employeeId: number) {
    const resolution = await this.resolutionRepo.findOne({ where: { id: resolutionId } });
    if (!resolution) throw new NotFoundException(`Bản ghi xử lý #${resolutionId} không tồn tại`);
    if (resolution.trangThai !== 'HoanThanh') {
      throw new BadRequestException('Chỉ ghi nhận xử lý hàng lỗi sau khi resolution đã HoanThanh');
    }

    const handlingCu = resolution.defectiveHandling;
    resolution.defectiveHandling = dto.defectiveHandling;
    resolution.defectiveHandledAt = new Date();
    resolution.defectiveHandledById = employeeId;
    resolution.defectiveNotes = dto.defectiveNotes ?? null;

    const saved = await this.resolutionRepo.save(resolution);
    this.auditLogsService.log({
      entityType:  'DoiTraXuLy',
      entityId:    String(resolutionId),
      entityLabel: `Xử lý đổi/trả #${resolutionId} — hàng lỗi`,
      actionType:  'CapNhat',
      actionDetail: `Nhân viên #${employeeId} ghi nhận xử lý hàng lỗi cho resolution #${resolutionId}: ${dto.defectiveHandling}`,
      before: JSON.stringify({ defectiveHandling: handlingCu }),
      after: JSON.stringify({
        defectiveHandling:    dto.defectiveHandling,
        defectiveHandledAt:   saved.defectiveHandledAt,
        defectiveHandledById: employeeId,
        defectiveNotes:       dto.defectiveNotes ?? null,
      }),
    });
    return saved;
  }

  async completeDefectiveReuse(resolutionId: number, dto: CompleteReuseDto, employeeId: number) {
    const resolution = await this.resolutionRepo.findOne({ where: { id: resolutionId } });
    if (!resolution) throw new NotFoundException(`Bản ghi xử lý #${resolutionId} không tồn tại`);
    if (resolution.defectiveHandling !== 'TaiSuDung') {
      throw new BadRequestException('Endpoint này chỉ dùng cho resolution có defectiveHandling = TaiSuDung');
    }
    if (resolution.phieuNhapKhoId) {
      throw new BadRequestException('Phiếu nhập kho đã được gán cho bản ghi này — không thể gán lại');
    }

    const [receipt]: Array<{ trang_thai: string; loai_phieu: string }> = await this.dataSource.query(
      `SELECT trang_thai, loai_phieu FROM phieu_nhap_kho WHERE phieu_nhap_id = ?`,
      [dto.phieuNhapKhoId],
    );
    if (!receipt) throw new BadRequestException(`Phiếu nhập kho #${dto.phieuNhapKhoId} không tồn tại`);
    if (receipt.loai_phieu !== 'NhapHoanTra') throw new BadRequestException('Phiếu nhập phải là loại NhapHoanTra');
    if (!['DaDuyet', 'TiepNhanMot'].includes(receipt.trang_thai)) {
      throw new BadRequestException('Phiếu nhập chưa được duyệt — hàng sửa chưa vào kho');
    }
    const [linked]: Array<{ xu_ly_id: number }> = await this.dataSource.query(
      `SELECT xu_ly_id FROM doi_tra_xu_ly WHERE phieu_nhap_kho_id = ? LIMIT 1`,
      [dto.phieuNhapKhoId],
    );
    if (linked) throw new BadRequestException(`Phiếu nhập #${dto.phieuNhapKhoId} đã được liên kết với resolution khác`);

    resolution.phieuNhapKhoId = dto.phieuNhapKhoId;
    resolution.defectiveHandledAt = new Date();
    resolution.defectiveHandledById = employeeId;
    if (dto.ghiChu) resolution.defectiveNotes = dto.ghiChu;

    await this.resolutionRepo.save(resolution);
    this.auditLogsService.log({
      entityType:  'DoiTraXuLy',
      entityId:    String(resolutionId),
      entityLabel: `Xử lý đổi/trả #${resolutionId} — tái sử dụng hàng lỗi`,
      actionType:  'CapNhat',
      actionDetail: `Nhân viên #${employeeId} hoàn tất tái sử dụng hàng lỗi — liên kết phiếu nhập kho #${dto.phieuNhapKhoId} với resolution #${resolutionId}`,
      after: JSON.stringify({
        phieuNhapKhoId:       dto.phieuNhapKhoId,
        defectiveHandledAt:   resolution.defectiveHandledAt,
        defectiveHandledById: employeeId,
        ghiChu:               dto.ghiChu ?? null,
      }),
    });
    return { resolutionId, phieuNhapKhoId: dto.phieuNhapKhoId, status: 'completed' };
  }
}
