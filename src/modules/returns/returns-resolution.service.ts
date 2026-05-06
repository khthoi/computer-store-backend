import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ReturnRequest } from './entities/return-request.entity';
import { ReturnRequestItem } from './entities/return-request-item.entity';
import { ReturnResolution } from './entities/return-resolution.entity';
import { ProcessRefundResolutionDto, ProcessExchangeResolutionDto, ChangeResolutionDto } from './dto/process-resolution.dto';
import { LoyaltyService } from '../loyalty/loyalty.service';

@Injectable()
export class ReturnsResolutionService {
  constructor(
    @InjectRepository(ReturnRequest)
    private readonly returnRepo: Repository<ReturnRequest>,
    @InjectRepository(ReturnRequestItem)
    private readonly returnItemRepo: Repository<ReturnRequestItem>,
    @InjectRepository(ReturnResolution)
    private readonly resolutionRepo: Repository<ReturnResolution>,
    private readonly dataSource: DataSource,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  async processRefund(returnRequestId: number, dto: ProcessRefundResolutionDto, employeeId: number) {
    const returnReq = await this.returnRepo.findOne({ where: { id: returnRequestId } });
    if (!returnReq) throw new NotFoundException(`Yêu cầu đổi/trả #${returnRequestId} không tồn tại`);
    if (!['DaDuyet', 'DaNhanHang', 'DaKiemTra', 'DangXuLy'].includes(returnReq.status)) {
      throw new BadRequestException('Yêu cầu phải ở trạng thái DaDuyet, DaNhanHang, DaKiemTra hoặc DangXuLy để xử lý hoàn tiền');
    }
    if (returnReq.requestType === 'BaoHanh') {
      throw new BadRequestException('Yêu cầu bảo hành không thể xử lý theo hướng hoàn tiền — dùng luồng BaoHanh');
    }

    const returnItems = await this.returnItemRepo.find({ where: { yeuCauId: returnRequestId } });
    if (!returnItems.length) throw new BadRequestException('Yêu cầu không có sản phẩm nào để hoàn trả');

    return this.dataSource.transaction(async (manager) => {
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
      await manager.query(
        `UPDATE don_hang SET trang_thai_thanh_toan = 'DaHoan' WHERE don_hang_id = ?`,
        [returnReq.orderId],
      );

      if (dto.phieuNhapKhoId) {
        await this.validateImportReceipt(manager, dto.phieuNhapKhoId, 'hàng chưa thực sự vào kho');
      } else {
        for (const item of returnItems) {
          await manager.query(
            `INSERT INTO lich_su_nhap_xuat (phien_ban_id, loai_giao_dich, so_luong, nguoi_thuc_hien_id, ghi_chu)
             VALUES (?, 'HoanTra', ?, ?, ?)`,
            [item.phienBanId, item.soLuong, employeeId, `Hoàn tiền YC#${returnRequestId} — không có phiếu nhập kho`],
          );
          await manager.query(
            `UPDATE ton_kho SET so_luong_ton = so_luong_ton + ? WHERE phien_ban_id = ?`,
            [item.soLuong, item.phienBanId],
          );
        }
      }

      const resolution = manager.create(ReturnResolution, {
        yeuCauDoiTraId: returnRequestId, huongXuLy: 'HoanTien', trangThai: 'HoanThanh',
        phieuNhapKhoId: dto.phieuNhapKhoId ?? null,
        soTienHoan: dto.soTienHoan, phuongThucHoan: dto.phuongThucHoan,
        giaoDichHoanId: giaoDich?.giao_dich_id ?? null,
        maGiaoDichHoan: dto.maGiaoDichHoan ?? null, nganHangViHoan: dto.nganHangViHoan ?? null,
        thoiDiemHoan: new Date(), nguoiXuLyId: employeeId, ghiChu: dto.ghiChu ?? null,
      });
      await manager.save(resolution);

      await manager.query(
        `UPDATE yeu_cau_doi_tra SET trang_thai = 'HoanThanh' WHERE yeu_cau_id = ?`,
        [returnRequestId],
      );

      const [loyaltyRow]: Array<{ diem: number }> = await manager.query(
        `SELECT diem FROM loyalty_point_transaction
         WHERE loai_tham_chieu = 'don_hang' AND tham_chieu_id = ? AND loai_giao_dich = 'earn' LIMIT 1`,
        [returnReq.orderId],
      );
      if (loyaltyRow) {
        await this.loyaltyService.deductPointsForReturn(
          manager, returnReq.customerId, returnReq.orderId, loyaltyRow.diem,
        );
      }

      return { resolutionId: resolution.id, status: 'HoanThanh' };
    });
  }

  async processExchange(returnRequestId: number, dto: ProcessExchangeResolutionDto, employeeId: number) {
    const returnReq = await this.returnRepo.findOne({ where: { id: returnRequestId } });
    if (!returnReq) throw new NotFoundException(`Yêu cầu đổi/trả #${returnRequestId} không tồn tại`);
    if (!['DaDuyet', 'DaNhanHang', 'DaKiemTra', 'DangXuLy'].includes(returnReq.status)) {
      throw new BadRequestException('Yêu cầu phải ở trạng thái DaDuyet, DaNhanHang, DaKiemTra hoặc DangXuLy để xử lý đổi hàng');
    }
    if (returnReq.requestType === 'BaoHanh') {
      throw new BadRequestException('Yêu cầu bảo hành không thể xử lý theo hướng đổi hàng — dùng luồng BaoHanh');
    }

    const returnItems = await this.returnItemRepo.find({ where: { yeuCauId: returnRequestId } });
    if (!returnItems.length) throw new BadRequestException('Yêu cầu không có sản phẩm nào để đổi');

    const [originalOrder]: Array<{
      khach_hang_id: number; dia_chi_giao_hang_id: number; phuong_thuc_van_chuyen: string;
    }> = await this.dataSource.query(
      `SELECT khach_hang_id, dia_chi_giao_hang_id, phuong_thuc_van_chuyen FROM don_hang WHERE don_hang_id = ?`,
      [returnReq.orderId],
    );
    if (!originalOrder) throw new BadRequestException('Đơn hàng gốc không tồn tại');

    const snapshotItems: Array<{
      phien_ban_id: number; gia_tai_thoi_diem: string;
      ten_san_pham_snapshot: string; sku_snapshot: string;
    }> = await this.dataSource.query(
      `SELECT phien_ban_id, gia_tai_thoi_diem, ten_san_pham_snapshot, sku_snapshot
       FROM chi_tiet_don_hang WHERE don_hang_id = ? AND phien_ban_id IN (?)`,
      [returnReq.orderId, returnItems.map((i) => i.phienBanId)],
    );
    const snapshotMap = new Map(snapshotItems.map((r) => [r.phien_ban_id, r]));

    const stockRows: Array<{ phien_ban_id: number; so_luong_ton: number }> = await this.dataSource.query(
      `SELECT phien_ban_id, so_luong_ton FROM ton_kho WHERE phien_ban_id IN (?)`,
      [returnItems.map((i) => i.phienBanId)],
    );
    const stockMap = new Map(stockRows.map((r) => [r.phien_ban_id, r.so_luong_ton]));
    const insufficient = returnItems.filter((i) => (stockMap.get(i.phienBanId) ?? 0) < i.soLuong);
    if (insufficient.length > 0) {
      throw new BadRequestException({
        statusCode: 400, error: 'OUT_OF_STOCK',
        message: `Không đủ tồn kho để xuất hàng đổi: ${insufficient.map((i) => `variant #${i.phienBanId} cần ${i.soLuong}, còn ${stockMap.get(i.phienBanId) ?? 0}`).join('; ')}`,
        insufficientItems: insufficient.map((i) => ({ variantId: i.phienBanId, required: i.soLuong, available: stockMap.get(i.phienBanId) ?? 0 })),
      });
    }

    return this.dataSource.transaction(async (manager) => {
      const exchangeCode = `EXCH-${returnRequestId}-${Date.now()}`;
      const orderInsert: { insertId: number } = await manager.query(
        `INSERT INTO don_hang
           (ma_don_hang, khach_hang_id, dia_chi_giao_hang_id, trang_thai_don,
            phuong_thuc_van_chuyen, tong_tien_hang, tong_thanh_toan, ghi_chu_khach)
         VALUES (?, ?, ?, 'DaXacNhan', ?, 0, 0, ?)`,
        [exchangeCode, originalOrder.khach_hang_id, originalOrder.dia_chi_giao_hang_id,
          originalOrder.phuong_thuc_van_chuyen, `Đơn đổi hàng cho YC#${returnRequestId}`],
      );
      const newOrderId = orderInsert.insertId;

      for (const item of returnItems) {
        const snap = snapshotMap.get(item.phienBanId);
        const price = snap ? Number(snap.gia_tai_thoi_diem) : 0;
        await manager.query(
          `INSERT INTO chi_tiet_don_hang
             (don_hang_id, phien_ban_id, so_luong, gia_tai_thoi_diem, thanh_tien, ten_san_pham_snapshot, sku_snapshot)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [newOrderId, item.phienBanId, item.soLuong, price, price * item.soLuong,
            snap?.ten_san_pham_snapshot ?? '', snap?.sku_snapshot ?? ''],
        );
        await manager.query(
          `INSERT INTO lich_su_nhap_xuat (phien_ban_id, loai_giao_dich, so_luong, don_hang_id, nguoi_thuc_hien_id, ghi_chu)
           VALUES (?, 'Xuat', ?, ?, ?, ?)`,
          [item.phienBanId, item.soLuong, newOrderId, employeeId, `Đổi hàng yêu cầu #${returnRequestId}`],
        );
        await manager.query(
          `UPDATE ton_kho SET so_luong_ton = so_luong_ton - ? WHERE phien_ban_id = ?`,
          [item.soLuong, item.phienBanId],
        );
      }

      if (dto.phieuNhapKhoId) {
        await this.validateImportReceipt(manager, dto.phieuNhapKhoId, 'hàng cũ chưa thực sự vào kho');
      } else {
        for (const item of returnItems) {
          await manager.query(
            `INSERT INTO lich_su_nhap_xuat (phien_ban_id, loai_giao_dich, so_luong, nguoi_thuc_hien_id, ghi_chu)
             VALUES (?, 'HoanTra', ?, ?, ?)`,
            [item.phienBanId, item.soLuong, employeeId, `Đổi hàng - hàng cũ về kho YC#${returnRequestId}`],
          );
          await manager.query(
            `UPDATE ton_kho SET so_luong_ton = so_luong_ton + ? WHERE phien_ban_id = ?`,
            [item.soLuong, item.phienBanId],
          );
        }
      }

      const resolution = manager.create(ReturnResolution, {
        yeuCauDoiTraId: returnRequestId, huongXuLy: 'GiaoHangMoi', trangThai: 'DangXuLy',
        phieuNhapKhoId: dto.phieuNhapKhoId ?? null, donHangDoiId: newOrderId,
        trackingDoiHang: dto.trackingDoiHang ?? null, carrierDoiHang: dto.carrierDoiHang ?? null,
        nguoiXuLyId: employeeId, ghiChu: dto.ghiChu ?? null,
      });
      await manager.save(resolution);

      await manager.query(
        `UPDATE yeu_cau_doi_tra SET trang_thai = 'DangXuLy', ngay_bat_dau_xu_ly = NOW() WHERE yeu_cau_id = ?`,
        [returnRequestId],
      );

      return { resolutionId: resolution.id, exchangeOrderId: newOrderId, exchangeOrderCode: exchangeCode };
    });
  }

  async changeResolution(returnRequestId: number, dto: ChangeResolutionDto, employeeId: number) {
    const returnReq = await this.returnRepo.findOne({ where: { id: returnRequestId } });
    if (!returnReq) throw new NotFoundException(`Yêu cầu đổi/trả #${returnRequestId} không tồn tại`);

    const allowedStatuses = ['DaDuyet', 'DaNhanHang', 'DaKiemTra'];
    if (!allowedStatuses.includes(returnReq.status)) {
      throw new BadRequestException(
        `Chỉ có thể đổi hướng xử lý khi ở trạng thái ${allowedStatuses.join('/')} — trạng thái hiện tại: ${returnReq.status}`,
      );
    }

    const allowedByType: Record<string, string[]> = {
      DoiHang: ['GiaoHangMoi', 'HoanTien'],
      TraHang: ['HoanTien', 'GiaoHangMoi'],
    };
    if (!(allowedByType[returnReq.requestType] ?? []).includes(dto.newResolution)) {
      throw new BadRequestException(
        `Hướng xử lý ${dto.newResolution} không hợp lệ cho loại yêu cầu ${returnReq.requestType}`,
      );
    }

    returnReq.resolution = dto.newResolution;
    returnReq.processedById = employeeId;
    await this.returnRepo.save(returnReq);
    return { id: returnRequestId, resolution: dto.newResolution };
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

  private async validateImportReceipt(
    manager: EntityManager,
    phieuNhapKhoId: number,
    pendingMsg: string,
  ): Promise<void> {
    const [receipt]: Array<{ trang_thai: string; loai_phieu: string }> = await manager.query(
      `SELECT trang_thai, loai_phieu FROM phieu_nhap_kho WHERE phieu_nhap_id = ?`,
      [phieuNhapKhoId],
    );
    if (!receipt) throw new BadRequestException(`Phiếu nhập kho #${phieuNhapKhoId} không tồn tại`);
    if (receipt.loai_phieu !== 'NhapHoanTra') throw new BadRequestException('Phiếu nhập phải là loại NhapHoanTra');
    if (!['DaDuyet', 'TiepNhanMot'].includes(receipt.trang_thai)) {
      throw new BadRequestException(`Phiếu nhập chưa được duyệt — ${pendingMsg}`);
    }
    const [linked]: Array<{ xu_ly_id: number }> = await manager.query(
      `SELECT xu_ly_id FROM doi_tra_xu_ly WHERE phieu_nhap_kho_id = ? LIMIT 1`,
      [phieuNhapKhoId],
    );
    if (linked) throw new BadRequestException(`Phiếu nhập #${phieuNhapKhoId} đã được liên kết với resolution khác`);
  }
}
