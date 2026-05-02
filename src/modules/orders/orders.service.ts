import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order, TrangThaiDon } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CheckoutDto, PhuongThucThanhToan } from './dto/checkout.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CartService } from '../cart/cart.service';
import { InventoryService } from '../inventory/inventory.service';
import { BatchService } from '../inventory/batch.service';
import { OrderItemResponseDto, OrderResponseDto, AdminOrderSummaryDto, mapToAdminOrderSummary, AdminOrderDetailDto, mapToAdminOrderDetail, mapToTransaction, NoteRow, ActivityLogRow } from './dto/order-response.dto';
import { OrderActivityLogService } from './order-activity-log.service';
import { OrderActivityStatus } from './entities/order-activity-log.entity';
import { UpdateOrderShippingDto } from './dto/update-order-shipping.dto';
import { AddOrderNoteDto } from './dto/add-order-note.dto';
import { OrdersReturnsQueryService } from './orders-returns-query.service';

const STATUS_ACTIONS: Partial<Record<TrangThaiDon, string>> = {
  [TrangThaiDon.DA_XAC_NHAN]: 'Xác nhận đơn hàng',
  [TrangThaiDon.DONG_GOI]:    'Đóng gói đơn hàng',
  [TrangThaiDon.DANG_GIAO]:   'Bàn giao đơn vị vận chuyển',
  [TrangThaiDon.DA_GIAO]:     'Giao hàng thành công',
  [TrangThaiDon.DA_HUY]:      'Hủy đơn hàng',
  [TrangThaiDon.HOAN_TRA]:    'Chuyển trạng thái hoàn trả',
};

const ORDER_STATUS_TO_ACTIVITY: Partial<Record<TrangThaiDon, OrderActivityStatus>> = {
  [TrangThaiDon.CHO_XAC_NHAN]: OrderActivityStatus.CHO_XU_LY,
  [TrangThaiDon.DA_XAC_NHAN]:  OrderActivityStatus.DA_XAC_NHAN,
  [TrangThaiDon.DONG_GOI]:     OrderActivityStatus.DANG_CHUAN_BI_HANG,
  [TrangThaiDon.DANG_GIAO]:    OrderActivityStatus.DANG_GIAO,
  [TrangThaiDon.DA_GIAO]:      OrderActivityStatus.DA_GIAO,
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private itemRepo: Repository<OrderItem>,
    private dataSource: DataSource,
    private cartService: CartService,
    private inventoryService: InventoryService,
    private batchService: BatchService,
    private ordersReturnsQueryService: OrdersReturnsQueryService,
    private activityLogService: OrderActivityLogService,
  ) {}

  async checkout(userId: number, dto: CheckoutDto): Promise<{ order: OrderResponseDto; paymentUrl?: string }> {
    const cart = await this.cartService.getMyCart(userId);
    if (!cart.items?.length) throw new BadRequestException('Giỏ hàng trống');

    const address = await this.dataSource.query(
      `SELECT dia_chi_id FROM dia_chi_giao_hang WHERE dia_chi_id = ? AND khach_hang_id = ?`,
      [dto.diaChiGiaoHangId, userId],
    );
    if (!address.length) throw new NotFoundException('Địa chỉ giao hàng không hợp lệ');

    const variantIds = cart.items.map((i) => i.variantId);
    const variants: Array<{ phien_ban_id: number; gia_ban: number; sku: string; trang_thai: string; ten_san_pham: string; ton_kho: number }> =
      await this.dataSource.query(
        `SELECT pbsp.phien_ban_id, pbsp.gia_ban, pbsp.sku, pbsp.trang_thai,
                sp.ten_san_pham, COALESCE(SUM(tk.so_luong_ton), 0) AS ton_kho
         FROM phien_ban_san_pham pbsp
         JOIN san_pham sp ON sp.san_pham_id = pbsp.san_pham_id
         LEFT JOIN ton_kho tk ON tk.phien_ban_id = pbsp.phien_ban_id
         WHERE pbsp.phien_ban_id IN (?)
         GROUP BY pbsp.phien_ban_id`,
        [variantIds],
      );
    const variantMap = new Map(variants.map((v) => [v.phien_ban_id, v]));

    let tongTienHang = 0;
    const orderItemsData: Omit<OrderItem, 'id' | 'order' | 'phienBan'>[] = [];

    for (const item of cart.items) {
      const v = variantMap.get(item.variantId);
      if (!v || v.trang_thai === 'An') throw new BadRequestException(`Sản phẩm không còn bán`);
      if (v.ton_kho < item.quantity)
        throw new BadRequestException(`Sản phẩm "${v.ten_san_pham}" không đủ hàng`);

      const thanhTien = Number(v.gia_ban) * item.quantity;
      tongTienHang += thanhTien;
      orderItemsData.push({
        donHangId: 0,
        phienBanId: item.variantId,
        soLuong: item.quantity,
        giaTaiThoiDiem: Number(v.gia_ban),
        thanhTien,
        tenSanPhamSnapshot: v.ten_san_pham,
        skuSnapshot: v.sku,
      });
    }

    const phiVanChuyen = dto.phuongThucVanChuyen === 'GiaoNhanh' ? 40000 : dto.phuongThucVanChuyen === 'NhanTaiCuaHang' ? 0 : 25000;

    let soTienGiamGia = 0;
    if (dto.couponCode) {
      soTienGiamGia = await this.applyDiscount(dto.couponCode, userId, tongTienHang);
    }

    const tongThanhToan = tongTienHang + phiVanChuyen - soTienGiamGia;

    return this.dataSource.transaction(async (manager) => {
      const maDonHang = this.generateOrderCode();

      const order = manager.create(Order, {
        maDonHang,
        khachHangId: userId,
        diaChiGiaoHangId: dto.diaChiGiaoHangId,
        phuongThucVanChuyen: dto.phuongThucVanChuyen as any,
        phuongThucThanhToan: dto.phuongThucThanhToan,
        trangThaiThanhToan: 'ChuaThanhToan',
        phiVanChuyen,
        tongTienHang,
        soTienGiamGia,
        discountTotal: soTienGiamGia,
        tongThanhToan,
        ghiChuKhach: dto.ghiChuKhach ?? null,
        trangThaiDon: TrangThaiDon.CHO_XAC_NHAN,
      });
      const savedOrder = await manager.save(Order, order);

      const items = orderItemsData.map((d) =>
        manager.create(OrderItem, { ...d, donHangId: savedOrder.id }),
      );
      await manager.save(OrderItem, items);

      await this.activityLogService.log(
        manager,
        savedOrder.id,
        { name: 'Khách hàng', role: 'Khách hàng' },
        'Đặt hàng',
        `Đơn hàng được tạo qua kênh website`,
        OrderActivityStatus.CHO_XU_LY,
      );

      for (const item of cart.items) {
        await manager.query(
          `UPDATE ton_kho SET so_luong_ton = so_luong_ton - ?
           WHERE phien_ban_id = ? ORDER BY so_luong_ton DESC LIMIT 1`,
          [item.quantity, item.variantId],
        );
      }

      if (dto.phuongThucThanhToan === PhuongThucThanhToan.COD) {
        await this.cartService.clearCart(userId);
      }

      const fullOrder = await manager.findOne(Order, {
        where: { id: savedOrder.id },
        relations: ['items'],
      });

      return { order: this.toDto(fullOrder!) };
    });
  }

  async findMyOrders(userId: number, query: QueryOrderDto) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.khachHangId = :userId', { userId })
      .orderBy('o.ngayDatHang', 'DESC')
      .skip(((query.page ?? 1) - 1) * (query.limit ?? 10))
      .take(query.limit ?? 10);

    if (query.trangThai) qb.andWhere('o.trangThaiDon = :tt', { tt: query.trangThai });

    const [data, total] = await qb.getManyAndCount();
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    return { data: data.map((o) => this.toDto(o)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number, userId?: number): Promise<OrderResponseDto> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (userId && order.khachHangId !== userId) throw new ForbiddenException();
    return this.toDto(order);
  }

  async cancelOrder(id: number, userId: number): Promise<OrderResponseDto> {
    const order = await this.orderRepo.findOne({ where: { id }, relations: ['items'] });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (order.khachHangId !== userId) throw new ForbiddenException();
    if (order.trangThaiDon !== TrangThaiDon.CHO_XAC_NHAN) {
      throw new BadRequestException('Chỉ có thể hủy đơn hàng ở trạng thái Chờ xác nhận');
    }
    const updated = await this.changeStatus(order, TrangThaiDon.DA_HUY, null, 'Khách hàng hủy đơn', true);
    return this.toDto(updated);
  }

  async updateStatus(id: number, dto: UpdateOrderStatusDto, adminId: number): Promise<OrderResponseDto> {
    const order = await this.orderRepo.findOne({ where: { id }, relations: ['items'] });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    this.validateStatusTransition(order.trangThaiDon, dto.trangThai);
    const updated = await this.changeStatus(order, dto.trangThai, adminId, dto.ghiChu, dto.trangThai === TrangThaiDon.DA_HUY);
    return this.toDto(updated);
  }

  async updateStatusAdmin(orderCode: string, dto: UpdateOrderStatusDto, adminId: number): Promise<OrderResponseDto> {
    const order = await this.orderRepo.findOne({ where: { maDonHang: orderCode }, relations: ['items'] });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    this.validateStatusTransition(order.trangThaiDon, dto.trangThai);
    const updated = await this.changeStatus(order, dto.trangThai, adminId, dto.ghiChu, dto.trangThai === TrangThaiDon.DA_HUY);
    return this.toDto(updated);
  }

  async findAllAdmin(query: QueryOrderDto): Promise<{ data: AdminOrderSummaryDto[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = (query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';

    const allowedSortBy: Record<string, string> = {
      id:            'o.id',
      createdAt:     'o.ngayDatHang',
      status:        'o.trangThaiDon',
      paymentStatus: 'o.trangThaiThanhToan',
      grandTotal:    'o.tongThanhToan',
      customerName:  'kh.ho_ten',
    };

    const needsCustomerJoin = !!query.q || sortBy === 'customerName';

    const qb = this.orderRepo.createQueryBuilder('o');
    if (needsCustomerJoin) {
      qb.leftJoin('khach_hang', 'kh', 'kh.khach_hang_id = o.khach_hang_id');
    }
    if (query.trangThai) qb.andWhere('o.trangThaiDon = :tt', { tt: query.trangThai });
    if (query.trangThaiThanhToan) qb.andWhere('o.trangThaiThanhToan = :tttt', { tttt: query.trangThaiThanhToan });
    if (query.q) {
      qb.andWhere(
        '(o.ma_don_hang LIKE :q OR kh.ho_ten LIKE :q OR kh.so_dien_thoai LIKE :q)',
        { q: `%${query.q}%` },
      );
    }

    const orderCol = allowedSortBy[sortBy] ?? 'o.ngayDatHang';
    qb.orderBy(orderCol, sortOrder);

    const total = await qb.getCount();
    // Use offset/limit instead of skip/take to avoid TypeORM's special pagination
    // path (triggered by skip/take + joinAttributes), which crashes on raw-joined
    // table aliases (alias.metadata is null → TypeError on findColumnWithPropertyPath).
    const orders = await qb.offset((page - 1) * limit).limit(limit).getMany();

    if (!orders.length) {
      return { data: [], total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    const orderIds = orders.map((o) => o.id);
    const customerIds = [...new Set(orders.map((o) => o.khachHangId))];

    const customers: Array<{ khach_hang_id: number; ho_ten: string; so_dien_thoai: string | null }> =
      await this.dataSource.query(
        `SELECT khach_hang_id, ho_ten, so_dien_thoai FROM khach_hang WHERE khach_hang_id IN (?)`,
        [customerIds],
      );
    const customerMap = new Map(customers.map((c) => [c.khach_hang_id, c]));

    const counts: Array<{ don_hang_id: number; cnt: string }> = await this.dataSource.query(
      `SELECT don_hang_id, COUNT(*) AS cnt FROM chi_tiet_don_hang WHERE don_hang_id IN (?) GROUP BY don_hang_id`,
      [orderIds],
    );
    const countMap = new Map(counts.map((c) => [Number(c.don_hang_id), Number(c.cnt)]));

    const data = orders.map((o) =>
      mapToAdminOrderSummary(o, customerMap.get(o.khachHangId) ?? null, countMap.get(o.id) ?? 0),
    );
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneAdmin(orderCode: string): Promise<AdminOrderDetailDto> {
    const order = await this.orderRepo.findOne({ where: { maDonHang: orderCode } });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    const [customers, addresses, lineItems, notes, activityLogs] = await Promise.all([
      this.dataSource.query(
        `SELECT ho_ten, email, so_dien_thoai FROM khach_hang WHERE khach_hang_id = ?`,
        [order.khachHangId],
      ),
      this.dataSource.query(
        `SELECT ho_ten_nguoi_nhan, so_dien_thoai_nhan, dia_chi_chi_tiet, quan_huyen, tinh_thanh_pho
         FROM dia_chi_giao_hang WHERE dia_chi_id = ?`,
        [order.diaChiGiaoHangId],
      ),
      this.dataSource.query(
        `SELECT ct.chi_tiet_id, ct.phien_ban_id,
                COALESCE(pbsp.san_pham_id, 0) AS san_pham_id,
                ct.so_luong, ct.gia_tai_thoi_diem, ct.ten_san_pham_snapshot, ct.sku_snapshot,
                pbsp.ten_phien_ban,
                sp.ten_san_pham,
                pbsp.gia_goc,
                (SELECT url_hinh_anh FROM hinh_anh_san_pham
                 WHERE phien_ban_id = ct.phien_ban_id ORDER BY thu_tu ASC LIMIT 1) AS thumbnail_url
         FROM chi_tiet_don_hang ct
         LEFT JOIN phien_ban_san_pham pbsp ON pbsp.phien_ban_id = ct.phien_ban_id
         LEFT JOIN san_pham sp ON sp.san_pham_id = pbsp.san_pham_id
         WHERE ct.don_hang_id = ?`,
        [order.id],
      ),
      this.dataSource.query(
        `SELECT * FROM ghi_chu_don_hang WHERE don_hang_id = ? ORDER BY ngay_tao ASC`,
        [order.id],
      ) as Promise<NoteRow[]>,
      this.dataSource.query(
        `SELECT nhat_ky_id, ten_nguoi_thuc_hien, vai_tro, nguoi_thuc_hien_id, hanh_dong, chi_tiet, trang_thai_don, thoi_diem
         FROM nhat_ky_don_hang WHERE don_hang_id = ? ORDER BY thoi_diem ASC`,
        [order.id],
      ) as Promise<ActivityLogRow[]>,
    ]);

    return mapToAdminOrderDetail(order, customers[0] ?? null, addresses[0] ?? null, lineItems, notes, activityLogs);
  }

  async findTransactionByOrderCode(orderCode: string) {
    const rows = await this.dataSource.query(
      `SELECT gd.giao_dich_id, gd.don_hang_id, gd.phuong_thuc_thanh_toan, gd.so_tien,
              gd.trang_thai_giao_dich, gd.ma_giao_dich_ngoai, gd.ngan_hang_vi,
              gd.thoi_diem_thanh_toan, gd.ngay_tao, gd.ghi_chu_loi
       FROM giao_dich gd
       JOIN don_hang dh ON dh.don_hang_id = gd.don_hang_id
       WHERE dh.ma_don_hang = ?
       LIMIT 1`,
      [orderCode],
    );
    if (!rows.length) return null;
    return mapToTransaction(rows[0]);
  }

  async updateShippingAdmin(orderCode: string, dto: UpdateOrderShippingDto): Promise<AdminOrderDetailDto> {
    const order = await this.orderRepo.findOne({ where: { maDonHang: orderCode } });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (dto.carrier !== undefined) order.carrier = dto.carrier;
    if (dto.trackingNumber !== undefined) order.trackingNumber = dto.trackingNumber;
    if (dto.estimatedDelivery !== undefined) {
      order.estimatedDelivery = dto.estimatedDelivery ? new Date(dto.estimatedDelivery) : null;
    }
    await this.orderRepo.save(order);
    return this.findOneAdmin(orderCode);
  }

  async addNoteAdmin(orderCode: string, dto: AddOrderNoteDto, adminId?: number) {
    const order = await this.orderRepo.findOne({ where: { maDonHang: orderCode } });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    const result: { insertId: number } = await this.dataSource.query(
      `INSERT INTO ghi_chu_don_hang (don_hang_id, nhan_vien_id, ten_tac_gia, vai_tro_tac_gia, noi_dung)
       VALUES (?, ?, ?, ?, ?)`,
      [order.id, adminId ?? null, dto.authorName, dto.authorRole, dto.text],
    );
    const [row]: NoteRow[] = await this.dataSource.query(
      `SELECT * FROM ghi_chu_don_hang WHERE ghi_chu_id = ?`,
      [result.insertId],
    );
    return {
      id:         String(row.ghi_chu_id),
      authorName: row.ten_tac_gia,
      authorRole: row.vai_tro_tac_gia,
      authorId:   row.nhan_vien_id != null ? String(row.nhan_vien_id) : undefined,
      text:       row.noi_dung,
      createdAt:  (row.ngay_tao instanceof Date ? row.ngay_tao : new Date(row.ngay_tao)).toISOString(),
    };
  }

  async getReturnRequestsForOrder(orderCode: string) {
    return this.ordersReturnsQueryService.getReturnRequestsForOrder(orderCode);
  }


  private async changeStatus(
    order: Order,
    newStatus: TrangThaiDon,
    updaterId: number | null,
    ghiChu?: string,
    restoreStock = false,
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const oldStatus = order.trangThaiDon;
      order.trangThaiDon = newStatus;
      await manager.save(Order, order);

      const actor = updaterId
        ? await this.activityLogService.resolveEmployeeActor(manager, updaterId)
        : { name: 'Khách hàng', role: 'Khách hàng' };

      await this.activityLogService.log(
        manager, order.id, actor,
        STATUS_ACTIONS[newStatus] ?? 'Cập nhật trạng thái đơn hàng',
        ghiChu ?? undefined,
        ORDER_STATUS_TO_ACTIVITY[newStatus] ?? null,
      );

      if (newStatus === TrangThaiDon.DONG_GOI) {
        const packingItems = await manager.find(OrderItem, { where: { donHangId: order.id } });
        for (const item of packingItems) {
          const deductions = await this.batchService.deductFromBatches(manager, item.phienBanId, item.soLuong, 'FIFO');
          for (const d of deductions) {
            await this.inventoryService.recordMovement(manager, {
              phienBanId: item.phienBanId,
              soLuong: d.soLuong,
              loaiGiaoDich: 'Xuat',
              donHangId: order.id,
              loId: d.loId,
              giaVon: d.donGiaNhap,
              nguoiThucHienId: updaterId,
              ghiChu: `Xuất lô FIFO đơn hàng ${order.maDonHang}`,
            });
          }
        }
        await this.activityLogService.log(
          manager, order.id, actor,
          'Xuất lô hàng FIFO',
          `Đã deduct batch FIFO cho ${packingItems.length} dòng sản phẩm đơn hàng ${order.maDonHang}`,
        );
      }

      if (restoreStock) {
        const items = await manager.find(OrderItem, { where: { donHangId: order.id } });
        for (const item of items) {
          await manager.query(
            `UPDATE ton_kho SET so_luong_ton = so_luong_ton + ? WHERE phien_ban_id = ?`,
            [item.soLuong, item.phienBanId],
          );
          await this.inventoryService.recordMovement(manager, {
            phienBanId: item.phienBanId,
            soLuong: item.soLuong,
            loaiGiaoDich: 'HoanTra',
            donHangId: order.id,
            nguoiThucHienId: updaterId,
            ghiChu: `Hoàn kho đơn hàng ${order.maDonHang}`,
          });
        }
        await this.activityLogService.log(
          manager, order.id, actor,
          'Hoàn kho hàng hóa',
          `Đã hoàn kho ${items.length} sản phẩm về kho`,
        );
      }

      return manager.findOne(Order, {
        where: { id: order.id },
        relations: ['items'],
      }) as Promise<Order>;
    });
  }

  private validateStatusTransition(current: TrangThaiDon, next: TrangThaiDon): void {
    const allowed: Record<TrangThaiDon, TrangThaiDon[]> = {
      [TrangThaiDon.CHO_XAC_NHAN]: [TrangThaiDon.DA_XAC_NHAN, TrangThaiDon.DA_HUY],
      [TrangThaiDon.DA_XAC_NHAN]: [TrangThaiDon.DONG_GOI, TrangThaiDon.DA_HUY],
      [TrangThaiDon.DONG_GOI]: [TrangThaiDon.DANG_GIAO],
      [TrangThaiDon.DANG_GIAO]: [TrangThaiDon.DA_GIAO],
      [TrangThaiDon.DA_GIAO]: [TrangThaiDon.HOAN_TRA],
      [TrangThaiDon.DA_HUY]: [],
      [TrangThaiDon.HOAN_TRA]: [],
    };
    if (!allowed[current]?.includes(next)) {
      throw new BadRequestException(`Không thể chuyển từ "${current}" sang "${next}"`);
    }
  }

  private async applyDiscount(couponCode: string, userId: number, tongTien: number): Promise<number> {
    // Phase 5 sẽ tích hợp đầy đủ Promotions.
    return 0;
  }

  private generateOrderCode(): string {
    const now = new Date();
    const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(Math.random() * 9000) + 1000;
    return `ORD-${yyyymmdd}-${rand}`;
  }

  private toItemDto(i: OrderItem): OrderItemResponseDto {
    return {
      id: i.id,
      variantId: i.phienBanId,
      quantity: i.soLuong,
      priceAtTime: Number(i.giaTaiThoiDiem),
      lineTotal: Number(i.thanhTien),
      productNameSnapshot: i.tenSanPhamSnapshot,
      skuSnapshot: i.skuSnapshot,
    };
  }

  private toDto(order: Order): OrderResponseDto {
    return {
      id: order.id,
      orderCode: order.maDonHang,
      customerId: order.khachHangId,
      shippingAddressId: order.diaChiGiaoHangId,
      status: order.trangThaiDon,
      shippingMethod: order.phuongThucVanChuyen,
      shippingFee: Number(order.phiVanChuyen),
      subtotal: Number(order.tongTienHang),
      discountAmount: Number(order.soTienGiamGia),
      totalAmount: Number(order.tongThanhToan),
      customerNote: order.ghiChuKhach,
      orderedAt: order.ngayDatHang,
      updatedAt: order.ngayCapNhat,
      items: order.items?.map((i) => this.toItemDto(i)),
    };
  }
}
