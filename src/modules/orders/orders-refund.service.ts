import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { RefundRow } from './dto/order-response.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { SettleRefundDto } from './dto/settle-refund.dto';
import { RejectRefundDto } from './dto/reject-refund.dto';
import { OrderActivityLogService } from './order-activity-log.service';

@Injectable()
export class OrdersRefundService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    private dataSource: DataSource,
    private activityLogService: OrderActivityLogService,
  ) {}

  async processRefundAdmin(orderCode: string, dto: ProcessRefundDto, adminId?: number) {
    const order = await this.orderRepo.findOne({ where: { maDonHang: orderCode } });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    const [returnReq]: Array<{ yeu_cau_id: number; trang_thai: string; don_hang_id: number }> =
      await this.dataSource.query(
        `SELECT yeu_cau_id, trang_thai, don_hang_id FROM yeu_cau_doi_tra WHERE yeu_cau_id = ?`,
        [dto.yeuCauDoiTraId],
      );
    if (!returnReq || returnReq.don_hang_id !== order.id) {
      throw new BadRequestException('Yêu cầu đổi trả không hợp lệ hoặc không thuộc đơn hàng này');
    }
    if (!['DaDuyet', 'DangXuLy'].includes(returnReq.trang_thai)) {
      throw new BadRequestException('Yêu cầu đổi trả chưa được duyệt — không thể xử lý hoàn tiền');
    }

    const requestItems: Array<{ phien_ban_id: number; so_luong: number }> = await this.dataSource.query(
      `SELECT phien_ban_id, so_luong FROM yeu_cau_doi_tra_chi_tiet WHERE yeu_cau_id = ?`,
      [dto.yeuCauDoiTraId],
    );
    if (requestItems.length > 0) {
      const requestItemMap = new Map(requestItems.map((r) => [r.phien_ban_id, r.so_luong]));
      const alreadyRefundedForRequest: Array<{ phien_ban_id: number; refunded_qty: string }> =
        await this.dataSource.query(
          `SELECT rci.phien_ban_id, COALESCE(SUM(rci.so_luong), 0) AS refunded_qty
           FROM hoan_tien_don_hang_chi_tiet rci
           INNER JOIN hoan_tien_don_hang h ON h.hoan_tien_id = rci.hoan_tien_id
           WHERE h.yeu_cau_doi_tra_id = ? AND h.trang_thai <> 'TuChoi'
           GROUP BY rci.phien_ban_id`,
          [dto.yeuCauDoiTraId],
        );
      const alreadyRefundedForRequestMap = new Map(alreadyRefundedForRequest.map((r) => [r.phien_ban_id, Number(r.refunded_qty)]));
      for (const item of dto.items) {
        const vid = parseInt(item.variantId);
        const requestedQty = requestItemMap.get(vid);
        if (requestedQty === undefined) {
          throw new BadRequestException(`Phiên bản ${item.variantId} không có trong yêu cầu đổi trả #${dto.yeuCauDoiTraId}`);
        }
        const alreadyRefunded = alreadyRefundedForRequestMap.get(vid) ?? 0;
        if (alreadyRefunded + item.quantity > requestedQty) {
          throw new BadRequestException(
            `Phiên bản ${item.variantId}: vượt số lượng khách yêu cầu (yêu cầu ${requestedQty}, đã hoàn ${alreadyRefunded})`,
          );
        }
      }
    }

    const [giaoDich]: Array<{
      giao_dich_id: number; phuong_thuc_thanh_toan: string;
      so_tien: string; trang_thai_giao_dich: string;
    }> = await this.dataSource.query(
      `SELECT giao_dich_id, phuong_thuc_thanh_toan, so_tien, trang_thai_giao_dich
       FROM giao_dich WHERE don_hang_id = ? LIMIT 1`,
      [order.id],
    );
    if (giaoDich && giaoDich.trang_thai_giao_dich !== 'ThanhCong') {
      throw new BadRequestException('Chỉ hoàn tiền được cho giao dịch đã thanh toán thành công');
    }

    const originalAmount = giaoDich ? Number(giaoDich.so_tien) : Number(order.tongThanhToan);
    const variantIds = dto.items.map((i) => parseInt(i.variantId));
    const [orderedRows, refundedRows]: [
      Array<{ phien_ban_id: number; so_luong: number }>,
      Array<{ phien_ban_id: number; refunded_qty: string }>,
    ] = await Promise.all([
      this.dataSource.query(
        `SELECT phien_ban_id, so_luong FROM chi_tiet_don_hang WHERE don_hang_id = ? AND phien_ban_id IN (?)`,
        [order.id, variantIds],
      ),
      this.dataSource.query(
        `SELECT rci.phien_ban_id, COALESCE(SUM(rci.so_luong), 0) AS refunded_qty
         FROM hoan_tien_don_hang_chi_tiet rci
         INNER JOIN hoan_tien_don_hang h ON h.hoan_tien_id = rci.hoan_tien_id
         WHERE h.don_hang_id = ? AND h.trang_thai <> 'TuChoi' AND rci.phien_ban_id IN (?)
         GROUP BY rci.phien_ban_id`,
        [order.id, variantIds],
      ),
    ]);

    const orderedMap  = new Map(orderedRows.map((r) => [r.phien_ban_id, Number(r.so_luong)]));
    const refundedMap = new Map(refundedRows.map((r) => [r.phien_ban_id, Number(r.refunded_qty)]));

    for (const item of dto.items) {
      const vid = parseInt(item.variantId);
      const orderedQty = orderedMap.get(vid);
      if (orderedQty === undefined) throw new BadRequestException(`Phiên bản sản phẩm ${item.variantId} không thuộc đơn hàng này`);
      const alreadyRefundedQty = refundedMap.get(vid) ?? 0;
      if (alreadyRefundedQty + item.quantity > orderedQty) {
        throw new BadRequestException(
          `Phiên bản ${item.variantId}: chỉ còn ${orderedQty - alreadyRefundedQty} sản phẩm có thể hoàn`,
        );
      }
    }

    const [{ total: alreadyRefundedRaw }]: [{ total: string }] = await this.dataSource.query(
      `SELECT COALESCE(SUM(so_tien), 0) AS total FROM hoan_tien_don_hang WHERE don_hang_id = ? AND trang_thai <> 'TuChoi'`,
      [order.id],
    );
    const alreadyRefunded = Number(alreadyRefundedRaw);
    const remaining = originalAmount - alreadyRefunded;

    if (dto.amount <= 0) throw new BadRequestException('Số tiền hoàn phải lớn hơn 0');
    if (dto.amount > remaining) {
      throw new BadRequestException(`Số tiền hoàn tối đa là ${remaining.toLocaleString('vi-VN')}₫`);
    }

    const actualChannel = dto.method === 'store_credit'
      ? 'store_credit'
      : (giaoDich?.phuong_thuc_thanh_toan ?? order.phuongThucThanhToan ?? 'COD');
    const trangThai = dto.method === 'store_credit' || actualChannel === 'COD' ? 'DaHoan' : 'Cho';

    return this.dataSource.transaction(async (manager) => {
      const insertResult: { insertId: number } = await manager.query(
        `INSERT INTO hoan_tien_don_hang
           (don_hang_id, giao_dich_id, phuong_thuc, phuong_thuc_thuc_te, so_tien, items_json, nguoi_xu_ly, nguoi_xu_ly_id, trang_thai, ly_do, yeu_cau_doi_tra_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [order.id, giaoDich?.giao_dich_id ?? null, dto.method, actualChannel, dto.amount, JSON.stringify(dto.items), dto.processedBy, adminId ?? null, trangThai, dto.lyDo ?? null, dto.yeuCauDoiTraId],
      );

      for (const item of dto.items) {
        await manager.query(
          `INSERT INTO hoan_tien_don_hang_chi_tiet (hoan_tien_id, phien_ban_id, so_luong) VALUES (?, ?, ?)`,
          [insertResult.insertId, parseInt(item.variantId), item.quantity],
        );
      }

      if (trangThai === 'DaHoan') {
        const newTotal = alreadyRefunded + dto.amount;
        await manager.query(
          `UPDATE don_hang SET trang_thai_thanh_toan = ? WHERE don_hang_id = ?`,
          [newTotal >= originalAmount ? 'DaHoanTien' : 'HoanTienMotPhan', order.id],
        );
      } else {
        await manager.query(
          `UPDATE don_hang SET trang_thai_thanh_toan = 'HoanTienMotPhan'
           WHERE don_hang_id = ? AND trang_thai_thanh_toan NOT IN ('DaHoanTien', 'HoanTienMotPhan')`,
          [order.id],
        );
      }

      if (dto.method === 'store_credit') {
        await manager.query(
          `UPDATE khach_hang SET so_du_vi = so_du_vi + ? WHERE khach_hang_id = ?`,
          [dto.amount, order.khachHangId],
        );
      }

      await manager.query(
        `UPDATE yeu_cau_doi_tra SET trang_thai = 'DangXuLy' WHERE yeu_cau_id = ? AND trang_thai = 'DaDuyet'`,
        [dto.yeuCauDoiTraId],
      );

      const methodLabel = dto.method === 'store_credit' ? 'ví điện tử' : 'phương thức gốc';
      await this.activityLogService.log(
        manager,
        order.id,
        { name: dto.processedBy, role: 'Nhân viên', id: adminId ?? null },
        'Tạo phiếu hoàn tiền',
        `Hoàn ${dto.amount.toLocaleString('vi-VN')}₫ qua ${methodLabel}`,
      );

      const [row]: RefundRow[] = await manager.query(
        `SELECT * FROM hoan_tien_don_hang WHERE hoan_tien_id = ?`,
        [insertResult.insertId],
      );
      return this.mapRefundRow(row);
    });
  }

  async settleRefundAdmin(orderCode: string, refundId: number, dto: SettleRefundDto, adminId?: number) {
    const order = await this.orderRepo.findOne({ where: { maDonHang: orderCode } });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    const [refundRow]: Array<{ hoan_tien_id: number; trang_thai: string; so_tien: string; don_hang_id: number }> =
      await this.dataSource.query(
        `SELECT hoan_tien_id, trang_thai, so_tien, don_hang_id FROM hoan_tien_don_hang WHERE hoan_tien_id = ?`,
        [refundId],
      );
    if (!refundRow || refundRow.don_hang_id !== order.id) throw new NotFoundException('Bản ghi hoàn tiền không tồn tại');
    if (refundRow.trang_thai !== 'Cho') throw new BadRequestException('Chỉ có thể xác nhận hoàn tiền đang ở trạng thái Chờ');

    const [giaoDich]: Array<{ giao_dich_id: number; so_tien: string }> = await this.dataSource.query(
      `SELECT giao_dich_id, so_tien FROM giao_dich WHERE don_hang_id = ? LIMIT 1`,
      [order.id],
    );
    const originalAmount = giaoDich ? Number(giaoDich.so_tien) : Number(order.tongThanhToan);
    const settledAt = dto.settledAt ? new Date(dto.settledAt) : new Date();

    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `UPDATE hoan_tien_don_hang
         SET trang_thai = 'DaHoan', ma_giao_dich_hoan = ?, thoi_diem_hoan = ?, ngan_hang_vi_hoan = ?,
             ghi_chu_loi = ?, nguoi_duyet_id = ?
         WHERE hoan_tien_id = ?`,
        [dto.externalRef, settledAt, dto.bank ?? null, dto.note ?? null, adminId ?? null, refundId],
      );

      const [{ total: settledRaw }]: [{ total: string }] = await manager.query(
        `SELECT COALESCE(SUM(so_tien), 0) AS total FROM hoan_tien_don_hang WHERE don_hang_id = ? AND trang_thai = 'DaHoan'`,
        [order.id],
      );
      const settledTotal = Number(settledRaw);

      await manager.query(
        `UPDATE don_hang SET trang_thai_thanh_toan = ? WHERE don_hang_id = ?`,
        [settledTotal >= originalAmount ? 'DaHoanTien' : 'HoanTienMotPhan', order.id],
      );

      if (giaoDich && settledTotal >= originalAmount) {
        await manager.query(
          `UPDATE giao_dich SET trang_thai_giao_dich = 'DaHoan' WHERE giao_dich_id = ?`,
          [giaoDich.giao_dich_id],
        );
      }

      const actor = adminId
        ? await this.activityLogService.resolveEmployeeActor(manager, adminId)
        : { name: 'Hệ thống', role: 'Hệ thống' };
      const detail = [dto.bank, dto.externalRef].filter(Boolean).join(' — ') || undefined;
      await this.activityLogService.log(manager, order.id, actor, 'Xác nhận hoàn tiền', detail);
    });

    const [updated]: RefundRow[] = await this.dataSource.query(
      `SELECT * FROM hoan_tien_don_hang WHERE hoan_tien_id = ?`, [refundId],
    );
    return this.mapRefundRow(updated);
  }

  async rejectRefundAdmin(orderCode: string, refundId: number, dto: RejectRefundDto, adminId?: number) {
    const order = await this.orderRepo.findOne({ where: { maDonHang: orderCode } });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    const [refundRow]: Array<{ hoan_tien_id: number; trang_thai: string; don_hang_id: number }> =
      await this.dataSource.query(
        `SELECT hoan_tien_id, trang_thai, don_hang_id FROM hoan_tien_don_hang WHERE hoan_tien_id = ?`,
        [refundId],
      );
    if (!refundRow || refundRow.don_hang_id !== order.id) throw new NotFoundException('Bản ghi hoàn tiền không tồn tại');
    if (refundRow.trang_thai !== 'Cho') throw new BadRequestException('Chỉ có thể từ chối hoàn tiền đang ở trạng thái Chờ');

    const [giaoDich]: Array<{ so_tien: string }> = await this.dataSource.query(
      `SELECT so_tien FROM giao_dich WHERE don_hang_id = ? LIMIT 1`, [order.id],
    );
    const originalAmount = giaoDich ? Number(giaoDich.so_tien) : Number(order.tongThanhToan);

    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `UPDATE hoan_tien_don_hang SET trang_thai = 'TuChoi', ghi_chu_loi = ?, nguoi_duyet_id = ? WHERE hoan_tien_id = ?`,
        [dto.reason, adminId ?? null, refundId],
      );

      const [{ settled: settledRaw, pending: pendingRaw }]: [{ settled: string; pending: string }] =
        await manager.query(
          `SELECT
             COALESCE(SUM(CASE WHEN trang_thai = 'DaHoan' THEN so_tien ELSE 0 END), 0) AS settled,
             COUNT(CASE WHEN trang_thai = 'Cho' THEN 1 END) AS pending
           FROM hoan_tien_don_hang WHERE don_hang_id = ?`,
          [order.id],
        );
      const settledTotal = Number(settledRaw);
      const pendingCount = Number(pendingRaw);

      let newStatus: string;
      if (settledTotal >= originalAmount) newStatus = 'DaHoanTien';
      else if (settledTotal > 0 || pendingCount > 0) newStatus = 'HoanTienMotPhan';
      else newStatus = 'DaThanhToan';

      await manager.query(
        `UPDATE don_hang SET trang_thai_thanh_toan = ? WHERE don_hang_id = ?`, [newStatus, order.id],
      );

      const actor = adminId
        ? await this.activityLogService.resolveEmployeeActor(manager, adminId)
        : { name: 'Hệ thống', role: 'Hệ thống' };
      await this.activityLogService.log(manager, order.id, actor, 'Từ chối hoàn tiền', dto.reason);
    });

    const [updated]: RefundRow[] = await this.dataSource.query(
      `SELECT * FROM hoan_tien_don_hang WHERE hoan_tien_id = ?`, [refundId],
    );
    return this.mapRefundRow(updated);
  }


  mapRefundRow(r: RefundRow) {
    return {
      id:              String(r.hoan_tien_id),
      createdAt:       (r.ngay_tao instanceof Date ? r.ngay_tao : new Date(r.ngay_tao)).toISOString(),
      method:          r.phuong_thuc as 'original' | 'store_credit',
      amount:          Number(r.so_tien),
      status:          ({ DaHoan: 'completed', TuChoi: 'rejected' } as Record<string, string>)[r.trang_thai] ?? 'pending',
      items:           JSON.parse(r.items_json),
      processedBy:     r.nguoi_xu_ly,
      processedById:   r.nguoi_xu_ly_id != null
        ? String(r.nguoi_xu_ly_id)
        : r.nguoi_duyet_id != null ? String(r.nguoi_duyet_id) : undefined,
      externalRef:     r.ma_giao_dich_hoan ?? undefined,
      settledAt:       r.thoi_diem_hoan
        ? (r.thoi_diem_hoan instanceof Date ? r.thoi_diem_hoan : new Date(r.thoi_diem_hoan)).toISOString()
        : undefined,
      bank:            r.ngan_hang_vi_hoan ?? undefined,
      errorNote:       r.ghi_chu_loi ?? undefined,
      returnRequestId: r.yeu_cau_doi_tra_id ?? undefined,
    };
  }
}
