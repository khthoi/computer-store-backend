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
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { CheckoutDto, PhuongThucThanhToan } from './dto/checkout.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CartService } from '../cart/cart.service';
import { InventoryService } from '../inventory/inventory.service';
import { OrderItemResponseDto, OrderResponseDto } from './dto/order-response.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private itemRepo: Repository<OrderItem>,
    @InjectRepository(OrderStatusHistory) private historyRepo: Repository<OrderStatusHistory>,
    private dataSource: DataSource,
    private cartService: CartService,
    private inventoryService: InventoryService,
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
    const orderItemsData: Omit<OrderItem, 'id' | 'order'>[] = [];

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

      await manager.save(
        OrderStatusHistory,
        manager.create(OrderStatusHistory, {
          donHangId: savedOrder.id,
          trangThaiMoi: TrangThaiDon.CHO_XAC_NHAN,
          trangThaiCu: null,
          ghiChu: 'Đơn hàng được tạo',
        }),
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
        relations: ['items', 'statusHistory'],
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
    return { data: data.map((o) => this.toDto(o)), total, page: query.page ?? 1, limit: query.limit ?? 10 };
  }

  async findOne(id: number, userId?: number): Promise<OrderResponseDto> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['items', 'statusHistory'],
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (userId && order.khachHangId !== userId) throw new ForbiddenException();
    return this.toDto(order);
  }

  async cancelOrder(id: number, userId: number): Promise<OrderResponseDto> {
    const order = await this.orderRepo.findOne({ where: { id }, relations: ['items', 'statusHistory'] });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (order.khachHangId !== userId) throw new ForbiddenException();
    if (order.trangThaiDon !== TrangThaiDon.CHO_XAC_NHAN) {
      throw new BadRequestException('Chỉ có thể hủy đơn hàng ở trạng thái Chờ xác nhận');
    }
    const updated = await this.changeStatus(order, TrangThaiDon.DA_HUY, null, 'Khách hàng hủy đơn', true);
    return this.toDto(updated);
  }

  async updateStatus(id: number, dto: UpdateOrderStatusDto, adminId: number): Promise<OrderResponseDto> {
    const order = await this.orderRepo.findOne({ where: { id }, relations: ['items', 'statusHistory'] });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    this.validateStatusTransition(order.trangThaiDon, dto.trangThai);
    const updated = await this.changeStatus(order, dto.trangThai, adminId, dto.ghiChu, dto.trangThai === TrangThaiDon.DA_HUY);
    return this.toDto(updated);
  }

  async findAllAdmin(query: QueryOrderDto) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .orderBy('o.ngayDatHang', 'DESC')
      .skip(((query.page ?? 1) - 1) * (query.limit ?? 10))
      .take(query.limit ?? 10);

    if (query.trangThai) qb.andWhere('o.trangThaiDon = :tt', { tt: query.trangThai });

    const [data, total] = await qb.getManyAndCount();
    return { data: data.map((o) => this.toDto(o)), total, page: query.page ?? 1, limit: query.limit ?? 10 };
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

      await manager.save(
        OrderStatusHistory,
        manager.create(OrderStatusHistory, {
          donHangId: order.id,
          trangThaiMoi: newStatus,
          trangThaiCu: oldStatus,
          nguoiCapNhatId: updaterId,
          ghiChu: ghiChu ?? null,
        }),
      );

      if (newStatus === TrangThaiDon.DA_XAC_NHAN) {
        const confirmedItems = await manager.find(OrderItem, { where: { donHangId: order.id } });
        for (const item of confirmedItems) {
          const [stockRow]: any[] = await manager.query(
            `SELECT kho_id FROM ton_kho WHERE phien_ban_id = ? ORDER BY so_luong_ton ASC LIMIT 1`,
            [item.phienBanId],
          );
          if (stockRow) {
            await this.inventoryService.recordMovement(manager, {
              phienBanId: item.phienBanId,
              khoId: stockRow.kho_id,
              soLuong: item.soLuong,
              loaiGiaoDich: 'Xuat',
              donHangId: order.id,
              nguoiThucHienId: updaterId,
              ghiChu: `Xuất kho đơn hàng ${order.maDonHang}`,
            });
          }
        }
      }

      if (restoreStock) {
        const items = await manager.find(OrderItem, { where: { donHangId: order.id } });
        for (const item of items) {
          const [stockRow]: any[] = await manager.query(
            `SELECT kho_id FROM ton_kho WHERE phien_ban_id = ? ORDER BY so_luong_ton ASC LIMIT 1`,
            [item.phienBanId],
          );
          await manager.query(
            `UPDATE ton_kho SET so_luong_ton = so_luong_ton + ?
             WHERE phien_ban_id = ? ORDER BY so_luong_ton ASC LIMIT 1`,
            [item.soLuong, item.phienBanId],
          );
          if (stockRow) {
            await this.inventoryService.recordMovement(manager, {
              phienBanId: item.phienBanId,
              khoId: stockRow.kho_id,
              soLuong: item.soLuong,
              loaiGiaoDich: 'HoanTra',
              donHangId: order.id,
              nguoiThucHienId: updaterId,
              ghiChu: `Hoàn kho đơn hàng ${order.maDonHang}`,
            });
          }
        }
      }

      return manager.findOne(Order, {
        where: { id: order.id },
        relations: ['items', 'statusHistory'],
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
