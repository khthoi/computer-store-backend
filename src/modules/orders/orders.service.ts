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
import { OrderAppliedPromotion, AppliedPromotionType } from './entities/order-applied-promotion.entity';
import { CheckoutDto, PhuongThucThanhToan } from './dto/checkout.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CartService } from '../cart/cart.service';
import { InventoryService } from '../inventory/services/inventory.service';
import { BatchService } from '../inventory/services/batch.service';
import { OrderItemResponseDto, OrderResponseDto, AdminOrderSummaryDto, mapToAdminOrderSummary, AdminOrderDetailDto, mapToAdminOrderDetail, mapToTransaction, NoteRow, ActivityLogRow } from './dto/order-response.dto';
import { OrderActivityLogService } from './order-activity-log.service';
import { OrderActivityStatus } from './entities/order-activity-log.entity';
import { UpdateOrderShippingDto } from './dto/update-order-shipping.dto';
import { AddOrderNoteDto } from './dto/add-order-note.dto';
import { OrdersReturnsQueryService } from './orders-returns-query.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PromotionEvaluatorService, EvaluationContext } from '../promotions/promotion-evaluator.service';
import { PromotionsService } from '../promotions/promotions.service';

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
    private auditLogsService: AuditLogsService,
    private promotionEvaluator: PromotionEvaluatorService,
    private promotionsService: PromotionsService,
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

    const flashSaleRows: Array<{
      phien_ban_id: number; flash_sale_id: number; flash_sale_ten: string;
      gia_flash: number; gia_goc_snapshot: number; so_luong_con_lai: number;
    }> = variantIds.length
      ? await this.dataSource.query(
          `SELECT fsi.phien_ban_id, fs.flash_sale_id, fs.ten AS flash_sale_ten,
                  fsi.gia_flash, fsi.gia_goc_snapshot,
                  (fsi.so_luong_gioi_han - fsi.so_luong_da_ban) AS so_luong_con_lai
           FROM flash_sale_item fsi
           JOIN flash_sale fs ON fs.flash_sale_id = fsi.flash_sale_id
           WHERE fsi.phien_ban_id IN (?)
             AND fs.trang_thai = 'active'
             AND fs.bat_dau <= NOW() AND fs.ket_thuc >= NOW()
             AND fsi.so_luong_da_ban < fsi.so_luong_gioi_han`,
          [variantIds],
        )
      : [];
    const flashSaleMap = new Map(flashSaleRows.map((r) => [Number(r.phien_ban_id), r]));

    let tongTienHang = 0;
    let totalItemSavings = 0;
    const orderItemsData: Array<Omit<OrderItem, 'id' | 'order' | 'phienBan'>> = [];
    const flashSaleConsumption: Array<{ phienBanId: number; quantity: number; flashSaleId: number }> = [];

    for (const item of cart.items) {
      const v = variantMap.get(item.variantId);
      if (!v || v.trang_thai === 'An') throw new BadRequestException(`Sản phẩm không còn bán`);
      if (v.ton_kho < item.quantity)
        throw new BadRequestException(`Sản phẩm "${v.ten_san_pham}" không đủ hàng`);

      const fs = flashSaleMap.get(item.variantId);
      const useFlashSale = !!fs && Number(fs.so_luong_con_lai) >= item.quantity;
      const giaTaiThoiDiem = useFlashSale ? Number(fs!.gia_flash) : Number(v.gia_ban);
      const giaGoc = useFlashSale ? Number(fs!.gia_goc_snapshot) : Number(v.gia_ban);

      const thanhTien = giaTaiThoiDiem * item.quantity;
      tongTienHang += thanhTien;
      totalItemSavings += (giaGoc - giaTaiThoiDiem) * item.quantity;

      orderItemsData.push({
        donHangId: 0,
        phienBanId: item.variantId,
        soLuong: item.quantity,
        giaTaiThoiDiem,
        thanhTien,
        tenSanPhamSnapshot: v.ten_san_pham,
        skuSnapshot: v.sku,
        giaGocSnapshot: giaGoc,
        flashSaleIdSnapshot: useFlashSale ? Number(fs!.flash_sale_id) : null,
        flashSaleTenSnapshot: useFlashSale ? fs!.flash_sale_ten : null,
        khuyenMaiIdSnapshot: null,
        khuyenMaiTenSnapshot: null,
      });

      if (useFlashSale) {
        flashSaleConsumption.push({
          phienBanId: item.variantId,
          quantity: item.quantity,
          flashSaleId: Number(fs!.flash_sale_id),
        });
      }
    }

    const phiVanChuyen = dto.phuongThucVanChuyen === 'GiaoNhanh' ? 40000 : dto.phuongThucVanChuyen === 'NhanTaiCuaHang' ? 0 : 25000;

    let soTienGiamGia = 0;
    let appliedPromotionId: number | null = null;
    let couponName: string | null = null;
    if (dto.couponCode) {
      const result = await this.applyDiscount(dto.couponCode, userId, tongTienHang, cart.items);
      soTienGiamGia = result.discountAmount;
      appliedPromotionId = result.promotionId;
      couponName = result.promotionName ?? dto.couponCode;
    }

    const tongThanhToan = tongTienHang + phiVanChuyen - soTienGiamGia;

    const deliveryDays =
      dto.phuongThucVanChuyen === 'GiaoNhanh' ? 2 :
      dto.phuongThucVanChuyen === 'NhanTaiCuaHang' ? 1 : 4;
    const estimatedDelivery = new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000);

    // Aggregate flash sale savings by flash_sale_id for applied-promotion rows
    const flashSaleAgg = new Map<number, { ten: string; soTienGiam: number }>();
    for (const oi of orderItemsData) {
      if (oi.flashSaleIdSnapshot && oi.giaGocSnapshot != null) {
        const savings = (Number(oi.giaGocSnapshot) - Number(oi.giaTaiThoiDiem)) * oi.soLuong;
        const cur = flashSaleAgg.get(oi.flashSaleIdSnapshot);
        if (cur) cur.soTienGiam += savings;
        else flashSaleAgg.set(oi.flashSaleIdSnapshot, { ten: oi.flashSaleTenSnapshot ?? 'Flash Sale', soTienGiam: savings });
      }
    }

    let savedOrderCapture: { id: number; maDonHang: string } | null = null;

    const result = await this.dataSource.transaction(async (manager) => {
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
        maCoupon: dto.couponCode ?? null,
        khuyenMaiId: appliedPromotionId,
        couponConsumed: false,
        ghiChuKhach: dto.ghiChuKhach ?? null,
        trangThaiDon: TrangThaiDon.CHO_XAC_NHAN,
        estimatedDelivery,
      });
      const savedOrder = await manager.save(Order, order);
      savedOrderCapture = { id: savedOrder.id, maDonHang: savedOrder.maDonHang };

      const items = orderItemsData.map((d) =>
        manager.create(OrderItem, { ...d, donHangId: savedOrder.id }),
      );
      await manager.save(OrderItem, items);

      const appliedPromos: OrderAppliedPromotion[] = [];
      for (const [flashSaleId, info] of flashSaleAgg) {
        appliedPromos.push(
          manager.create(OrderAppliedPromotion, {
            donHangId: savedOrder.id,
            khuyenMaiId: flashSaleId,
            ten: info.ten,
            maCoupon: null,
            loai: AppliedPromotionType.FLASHSALE,
            soTienGiam: info.soTienGiam,
          }),
        );
      }
      if (appliedPromotionId && soTienGiamGia > 0) {
        appliedPromos.push(
          manager.create(OrderAppliedPromotion, {
            donHangId: savedOrder.id,
            khuyenMaiId: appliedPromotionId,
            ten: couponName ?? (dto.couponCode ?? 'Voucher'),
            maCoupon: dto.couponCode ?? null,
            loai: AppliedPromotionType.COUPON,
            soTienGiam: soTienGiamGia,
          }),
        );
      }
      if (appliedPromos.length) await manager.save(OrderAppliedPromotion, appliedPromos);

      for (const c of flashSaleConsumption) {
        await manager.query(
          `UPDATE flash_sale_item SET so_luong_da_ban = so_luong_da_ban + ?
           WHERE flash_sale_id = ? AND phien_ban_id = ?`,
          [c.quantity, c.flashSaleId, c.phienBanId],
        );
      }

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

    if (savedOrderCapture) {
      const capture = savedOrderCapture as { id: number; maDonHang: string };
      this.auditLogsService.log({
        entityType: 'DonHang',
        entityId: String(capture.id),
        entityLabel: `Đơn hàng #${capture.maDonHang}`,
        actionType: 'TaoMoi',
        actionDetail: `Khách hàng đặt hàng qua website, tổng thanh toán ${tongThanhToan}đ`,
        after: JSON.stringify({ orderId: capture.id, orderCode: capture.maDonHang, tongThanhToan, phuongThucThanhToan: dto.phuongThucThanhToan }),
      });
    }

    return result;
  }

  async findMyOrders(userId: number, query: QueryOrderDto) {
    const page  = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.khachHangId = :userId', { userId })
      .orderBy('o.ngayDatHang', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (query.trangThai) qb.andWhere('o.trangThaiDon = :tt', { tt: query.trangThai });
    if (query.q) qb.andWhere('o.maDonHang LIKE :q', { q: `%${query.q}%` });

    const [orders, total] = await qb.getManyAndCount();
    if (!orders.length) return { items: [], total, page, limit, totalPages: 0 };

    const orderIds = orders.map((o) => o.id);

    const lineItems: Array<{
      chi_tiet_id: number; don_hang_id: number; phien_ban_id: number;
      so_luong: number; gia_tai_thoi_diem: string;
      ten_san_pham_snapshot: string; ten_phien_ban: string | null;
      thumbnail_url: string | null;
    }> = await this.dataSource.query(
      `SELECT ct.chi_tiet_id, ct.don_hang_id, ct.phien_ban_id,
              ct.so_luong, ct.gia_tai_thoi_diem, ct.ten_san_pham_snapshot,
              pbsp.ten_phien_ban,
              (SELECT url_hinh_anh FROM hinh_anh_san_pham
               WHERE phien_ban_id = ct.phien_ban_id ORDER BY thu_tu ASC LIMIT 1) AS thumbnail_url
       FROM chi_tiet_don_hang ct
       LEFT JOIN phien_ban_san_pham pbsp ON pbsp.phien_ban_id = ct.phien_ban_id
       WHERE ct.don_hang_id IN (?)
       ORDER BY ct.chi_tiet_id ASC`,
      [orderIds],
    );

    const deliveryLogs: Array<{ don_hang_id: number; delivered_at: Date }> =
      await this.dataSource.query(
        `SELECT don_hang_id, MAX(thoi_diem) AS delivered_at
         FROM nhat_ky_don_hang
         WHERE don_hang_id IN (?) AND trang_thai_don = 'DaGiao'
         GROUP BY don_hang_id`,
        [orderIds],
      );
    const deliveredMap = new Map(
      deliveryLogs.map((r) => [
        Number(r.don_hang_id),
        (r.delivered_at instanceof Date ? r.delivered_at : new Date(r.delivered_at)).toISOString(),
      ]),
    );

    const itemsByOrder = new Map<number, typeof lineItems>();
    for (const li of lineItems) {
      const oid = Number(li.don_hang_id);
      if (!itemsByOrder.has(oid)) itemsByOrder.set(oid, []);
      itemsByOrder.get(oid)!.push(li);
    }

    const items = orders.map((o) => {
      const lis = itemsByOrder.get(o.id) ?? [];
      return {
        numericId: o.id,
        id: o.maDonHang,
        status: o.trangThaiDon,
        placedAt: o.ngayDatHang.toISOString(),
        deliveredAt: deliveredMap.get(o.id) ?? null,
        returnWindowDays: 7,
        reviewWindowDays: 15,
        total: Number(o.tongThanhToan),
        itemCount: lis.reduce((s, x) => s + Number(x.so_luong), 0),
        items: lis.slice(0, 3).map((x) => ({
          id: String(x.chi_tiet_id),
          name: x.ten_san_pham_snapshot,
          variantLabel: x.ten_phien_ban ?? '',
          thumbnailUrl: x.thumbnail_url ?? null,
          quantity: Number(x.so_luong),
          unitPrice: Number(x.gia_tai_thoi_diem),
        })),
      };
    });

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number, userId?: number): Promise<any> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (userId && order.khachHangId !== userId) throw new ForbiddenException();

    const [lineItems, addresses, activityLogs, itemReviews]: [
      Array<{
        chi_tiet_id: number; phien_ban_id: number; so_luong: number;
        gia_tai_thoi_diem: string; ten_san_pham_snapshot: string;
        ten_phien_ban: string | null; sku: string | null; gia_goc: string | null;
        ten_san_pham: string | null; slug: string | null; san_pham_id: number | null;
        ten_thuong_hieu: string | null; ten_danh_muc: string | null;
        thumbnail_url: string | null;
      }>,
      Array<{
        ho_ten_nguoi_nhan: string; so_dien_thoai_nhan: string;
        dia_chi_chi_tiet: string; phuong_xa: string | null;
        quan_huyen: string; tinh_thanh_pho: string;
      }>,
      Array<{ label: string; note: string | null; status: string | null; timestamp: Date }>,
      Array<{
        phien_ban_id: number; rating: number; tieu_de: string | null;
        noi_dung: string | null; hinh_anh: string | null;
        review_status: string; created_at: Date;
      }>,
    ] = await Promise.all([
      this.dataSource.query(
        `SELECT ct.chi_tiet_id, ct.phien_ban_id, ct.so_luong,
                ct.gia_tai_thoi_diem, ct.ten_san_pham_snapshot,
                pbsp.ten_phien_ban, pbsp.sku, pbsp.gia_goc,
                sp.san_pham_id, sp.ten_san_pham, sp.slug,
                (SELECT GROUP_CONCAT(th.ten_thuong_hieu ORDER BY th.ten_thuong_hieu ASC SEPARATOR '|||')
                 FROM san_pham_thuong_hieu spth
                 INNER JOIN thuong_hieu th ON th.thuong_hieu_id = spth.thuong_hieu_id
                 WHERE spth.san_pham_id = sp.san_pham_id) AS ten_thuong_hieu,
                dm.ten_danh_muc,
                (SELECT url_hinh_anh FROM hinh_anh_san_pham
                 WHERE phien_ban_id = ct.phien_ban_id ORDER BY thu_tu ASC LIMIT 1) AS thumbnail_url
         FROM chi_tiet_don_hang ct
         LEFT JOIN phien_ban_san_pham pbsp ON pbsp.phien_ban_id = ct.phien_ban_id
         LEFT JOIN san_pham sp ON sp.san_pham_id = pbsp.san_pham_id
         LEFT JOIN danh_muc dm ON dm.danh_muc_id = sp.danh_muc_id
         WHERE ct.don_hang_id = ?
         ORDER BY ct.chi_tiet_id ASC`,
        [order.id],
      ),
      this.dataSource.query(
        `SELECT ho_ten_nguoi_nhan, so_dien_thoai_nhan, dia_chi_chi_tiet, phuong_xa, quan_huyen, tinh_thanh_pho
         FROM dia_chi_giao_hang WHERE dia_chi_id = ?`,
        [order.diaChiGiaoHangId],
      ),
      this.dataSource.query(
        `SELECT hanh_dong AS label, chi_tiet AS note, trang_thai_don AS status, thoi_diem AS timestamp
         FROM nhat_ky_don_hang
         WHERE don_hang_id = ?
         ORDER BY thoi_diem ASC`,
        [order.id],
      ),
      this.dataSource.query(
        `SELECT phien_ban_id, rating, tieu_de, noi_dung, hinh_anh, review_status, created_at
         FROM danh_gia_san_pham
         WHERE don_hang_id = ? AND khach_hang_id = ?`,
        [order.id, order.khachHangId],
      ),
    ]);

    const reviewByVariantId = new Map<number, typeof itemReviews[number]>();
    for (const r of itemReviews) {
      reviewByVariantId.set(Number(r.phien_ban_id), r);
    }
    const mapReviewStatus = (s: string): 'pending' | 'approved' | null => {
      if (s === 'Approved') return 'approved';
      if (s === 'Pending') return 'pending';
      return null;
    };

    const addr = addresses[0];
    const fullAddr = addr
      ? [addr.dia_chi_chi_tiet, addr.phuong_xa, addr.quan_huyen, addr.tinh_thanh_pho]
          .filter(Boolean).join(', ')
      : '';

    const deliveredLog = activityLogs.filter((l) => l.status === 'DaGiao').pop();

    return {
      numericId: order.id,
      id: order.maDonHang,
      status: order.trangThaiDon,
      placedAt: order.ngayDatHang.toISOString(),
      deliveredAt: deliveredLog
        ? (deliveredLog.timestamp instanceof Date
            ? deliveredLog.timestamp
            : new Date(deliveredLog.timestamp)
          ).toISOString()
        : null,
      returnWindowDays: 7,
      reviewWindowDays: 15,
      total: Number(order.tongThanhToan),
      itemCount: lineItems.reduce((s, x) => s + Number(x.so_luong), 0),
      items: lineItems.map((x) => {
        const r = reviewByVariantId.get(Number(x.phien_ban_id));
        const reviewStatus = r ? mapReviewStatus(r.review_status) : null;
        const brands = x.ten_thuong_hieu
          ? x.ten_thuong_hieu.split('|||').map((s) => s.trim()).filter((s) => s.length > 0)
          : [];
        return {
          id: String(x.chi_tiet_id),
          variantId: String(x.phien_ban_id),
          name: x.ten_san_pham ?? x.ten_san_pham_snapshot,
          slug: x.slug ?? '',
          brand: brands[0] ?? '',
          brands,
          categoryName: x.ten_danh_muc ?? '',
          sku: x.sku ?? '',
          variantLabel: x.ten_phien_ban ?? '',
          thumbnailUrl: x.thumbnail_url ?? null,
          quantity: Number(x.so_luong),
          unitPrice: Number(x.gia_tai_thoi_diem),
          subtotal: Number(x.gia_tai_thoi_diem) * Number(x.so_luong),
          originalUnitPrice: x.gia_goc != null ? Number(x.gia_goc) : null,
          review: r && reviewStatus
            ? (() => {
                let parsedImages: Array<{ url: string }> = [];
                if (r.hinh_anh) {
                  try {
                    const raw = typeof r.hinh_anh === 'string' ? JSON.parse(r.hinh_anh) : r.hinh_anh;
                    if (Array.isArray(raw)) parsedImages = raw;
                  } catch {
                    parsedImages = [];
                  }
                }
                return {
                  rating: Number(r.rating),
                  title: r.tieu_de ?? null,
                  content: r.noi_dung ?? null,
                  images: parsedImages.map((i) => i.url).filter(Boolean),
                  status: reviewStatus,
                  reviewedAt: (r.created_at instanceof Date
                    ? r.created_at
                    : new Date(r.created_at)
                  ).toISOString(),
                };
              })()
            : null,
        };
      }),
      shipping: {
        recipientName: addr?.ho_ten_nguoi_nhan ?? '',
        phone: addr?.so_dien_thoai_nhan ?? '',
        address: fullAddr,
        carrierName: order.carrier ?? null,
        trackingCode: order.trackingNumber ?? null,
        trackingUrl: null,
      },
      payment: {
        subtotal: Number(order.tongTienHang),
        discount: 0,
        couponCode: null,
        couponDiscount: Number(order.soTienGiamGia),
        shippingFee: Number(order.phiVanChuyen),
        total: Number(order.tongThanhToan),
        paymentMethodId: order.phuongThucThanhToan ?? 'COD',
        paymentMethodName: order.phuongThucThanhToan ?? 'COD',
      },
      timeline: activityLogs.map((l) => ({
        status: l.status ?? '',
        label: l.label ?? '',
        timestamp: l.timestamp
          ? (l.timestamp instanceof Date ? l.timestamp : new Date(l.timestamp)).toISOString()
          : null,
        note: l.note ?? undefined,
        completed: true,
      })),
    };
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
    const oldStatus = order.trangThaiDon;
    this.validateStatusTransition(order.trangThaiDon, dto.trangThai);
    const updated = await this.changeStatus(order, dto.trangThai, adminId, dto.ghiChu, dto.trangThai === TrangThaiDon.DA_HUY);
    this.auditLogsService.log({
      entityType: 'DonHang',
      entityId: String(id),
      entityLabel: `Đơn hàng #${order.maDonHang}`,
      actionType: 'DoiTrangThai',
      actionDetail: `Đổi trạng thái ${oldStatus} → ${dto.trangThai}`,
      before: JSON.stringify({ trangThai: oldStatus }),
      after: JSON.stringify({ trangThai: dto.trangThai }),
    });
    return this.toDto(updated);
  }

  async updateStatusAdmin(orderCode: string, dto: UpdateOrderStatusDto, adminId: number): Promise<OrderResponseDto> {
    const order = await this.orderRepo.findOne({ where: { maDonHang: orderCode }, relations: ['items'] });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    const oldStatus = order.trangThaiDon;
    this.validateStatusTransition(order.trangThaiDon, dto.trangThai);
    const updated = await this.changeStatus(order, dto.trangThai, adminId, dto.ghiChu, dto.trangThai === TrangThaiDon.DA_HUY);
    this.auditLogsService.log({
      entityType: 'DonHang',
      entityId: String(order.id),
      entityLabel: `Đơn hàng #${orderCode}`,
      actionType: 'DoiTrangThai',
      actionDetail: `Đổi trạng thái ${oldStatus} → ${dto.trangThai}`,
      before: JSON.stringify({ trangThai: oldStatus }),
      after: JSON.stringify({ trangThai: dto.trangThai }),
    });
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
    if (query.customerId)          qb.andWhere('o.khachHangId = :cid',        { cid:  query.customerId });
    if (query.trangThai)           qb.andWhere('o.trangThaiDon = :tt',        { tt:   query.trangThai });
    if (query.trangThaiThanhToan)  qb.andWhere('o.trangThaiThanhToan = :tttt', { tttt: query.trangThaiThanhToan });
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
    const before = { carrier: order.carrier, trackingNumber: order.trackingNumber, estimatedDelivery: order.estimatedDelivery };
    if (dto.carrier !== undefined) order.carrier = dto.carrier;
    if (dto.trackingNumber !== undefined) order.trackingNumber = dto.trackingNumber;
    if (dto.estimatedDelivery !== undefined) {
      order.estimatedDelivery = dto.estimatedDelivery ? new Date(dto.estimatedDelivery) : null;
    }
    await this.orderRepo.save(order);
    this.auditLogsService.log({
      entityType: 'DonHang',
      entityId: String(order.id),
      entityLabel: `Đơn hàng #${orderCode}`,
      actionType: 'CapNhat',
      actionDetail: `Cập nhật thông tin vận chuyển đơn hàng #${orderCode}`,
      before: JSON.stringify(before),
      after: JSON.stringify({ carrier: order.carrier, trackingNumber: order.trackingNumber, estimatedDelivery: order.estimatedDelivery }),
    });
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
    this.auditLogsService.log({
      entityType: 'GhiChuDonHang',
      entityId: String(result.insertId),
      entityLabel: `Ghi chú đơn hàng #${orderCode}`,
      actionType: 'TaoMoi',
      actionDetail: `Thêm ghi chú vào đơn hàng #${orderCode} bởi ${dto.authorName}`,
      after: JSON.stringify({ noteId: result.insertId, text: dto.text, authorName: dto.authorName }),
    });
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

      // Consume coupon usage atomically when order is confirmed. Doing it here
      // (rather than at checkout) ensures that abandoned / cancelled-before-
      // confirmation orders do not eat into the promotion's usage quota.
      if (newStatus === TrangThaiDon.DA_XAC_NHAN && order.khuyenMaiId && !order.couponConsumed) {
        const ok = await this.promotionsService.recordCouponConsumption(
          order.khuyenMaiId,
          order.khachHangId,
          order.id,
          Number(order.soTienGiamGia),
        );
        if (!ok) {
          throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng — không thể xác nhận đơn này');
        }
        await manager.update(Order, order.id, { couponConsumed: true });
        order.couponConsumed = true;
      }

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

  async getRecommendations(orderId: number, userId: number, limit: number): Promise<Array<{
    id: string; name: string; brand: string; href: string; thumbnail: string;
    price: number; originalPrice?: number; rating?: number; reviewCount?: number;
    stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
  }>> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (order.khachHangId !== userId) throw new ForbiddenException();

    const cats: Array<{ danh_muc_id: number; san_pham_id: number }> = await this.dataSource.query(
      `SELECT DISTINCT sp.danh_muc_id, sp.san_pham_id
       FROM chi_tiet_don_hang ct
       JOIN phien_ban_san_pham pbsp ON pbsp.phien_ban_id = ct.phien_ban_id
       JOIN san_pham sp ON sp.san_pham_id = pbsp.san_pham_id
       WHERE ct.don_hang_id = ?`,
      [orderId],
    );
    const categoryIds = Array.from(new Set(cats.map((r) => Number(r.danh_muc_id)).filter((x) => Number.isFinite(x))));
    const excludeProductIds = Array.from(new Set(cats.map((r) => Number(r.san_pham_id))));
    if (!categoryIds.length) return [];

    const rows: Array<{
      san_pham_id: number; ten_san_pham: string; slug: string; ten_thuong_hieu: string | null;
      gia_ban: string; gia_goc: string | null; ton_kho: number;
      thumbnail_url: string | null;
    }> = await this.dataSource.query(
      `SELECT sp.san_pham_id, sp.ten_san_pham, sp.slug,
              (SELECT th.ten_thuong_hieu
                 FROM san_pham_thuong_hieu spth
                 JOIN thuong_hieu th ON th.thuong_hieu_id = spth.thuong_hieu_id
                WHERE spth.san_pham_id = sp.san_pham_id
                ORDER BY spth.thuong_hieu_id ASC LIMIT 1) AS ten_thuong_hieu,
              (SELECT MIN(pbsp.gia_ban) FROM phien_ban_san_pham pbsp WHERE pbsp.san_pham_id = sp.san_pham_id AND pbsp.trang_thai != 'An') AS gia_ban,
              (SELECT MAX(pbsp.gia_goc) FROM phien_ban_san_pham pbsp WHERE pbsp.san_pham_id = sp.san_pham_id AND pbsp.trang_thai != 'An') AS gia_goc,
              (SELECT COALESCE(SUM(tk.so_luong_ton), 0)
               FROM phien_ban_san_pham pb
               LEFT JOIN ton_kho tk ON tk.phien_ban_id = pb.phien_ban_id
               WHERE pb.san_pham_id = sp.san_pham_id) AS ton_kho,
              (SELECT url_hinh_anh FROM hinh_anh_san_pham ha
               JOIN phien_ban_san_pham pb ON pb.phien_ban_id = ha.phien_ban_id
               WHERE pb.san_pham_id = sp.san_pham_id ORDER BY ha.thu_tu ASC LIMIT 1) AS thumbnail_url
       FROM san_pham sp
       WHERE sp.danh_muc_id IN (?)
         AND sp.trang_thai = 'DangBan'
         ${excludeProductIds.length ? 'AND sp.san_pham_id NOT IN (?)' : ''}
       ORDER BY sp.ngay_cap_nhat DESC
       LIMIT ?`,
      excludeProductIds.length
        ? [categoryIds, excludeProductIds, limit]
        : [categoryIds, limit],
    );

    return rows
      .filter((r) => r.thumbnail_url)
      .map((r) => {
        const price = Number(r.gia_ban) || 0;
        const originalPrice = r.gia_goc != null ? Number(r.gia_goc) : undefined;
        const stock = Number(r.ton_kho);
        return {
          id: String(r.san_pham_id),
          name: r.ten_san_pham,
          brand: r.ten_thuong_hieu ?? '',
          href: `/products/${r.slug}`,
          thumbnail: r.thumbnail_url ?? '',
          price,
          originalPrice: originalPrice && originalPrice > price ? originalPrice : undefined,
          stockStatus: stock <= 0 ? 'out-of-stock' as const : stock <= 5 ? 'low-stock' as const : 'in-stock' as const,
        };
      });
  }

  async getSuccessSummary(orderId: number, userId: number): Promise<import('./dto/success-summary-response.dto').SuccessOrderSummaryDto> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (order.khachHangId !== userId) throw new ForbiddenException();

    const [lineItems, addresses, customers, transactions, appliedPromos]: [
      Array<{
        chi_tiet_id: number; phien_ban_id: number; so_luong: number;
        gia_tai_thoi_diem: string; gia_goc_snapshot: string | null;
        ten_san_pham_snapshot: string;
        flash_sale_id_snapshot: number | null; flash_sale_ten_snapshot: string | null;
        ten_phien_ban: string | null; ten_san_pham: string | null; slug: string | null;
        ten_thuong_hieu: string | null; thumbnail_url: string | null;
      }>,
      Array<{
        ho_ten_nguoi_nhan: string; so_dien_thoai_nhan: string;
        dia_chi_chi_tiet: string; phuong_xa: string | null;
        quan_huyen: string; tinh_thanh_pho: string;
      }>,
      Array<{ email: string | null }>,
      Array<{ phuong_thuc: string | null; trang_thai: string; ngan_hang_vi: string | null }>,
      Array<{ id: number; khuyen_mai_id: number | null; ten: string; ma_coupon: string | null; loai: string; so_tien_giam: string }>,
    ] = await Promise.all([
      this.dataSource.query(
        `SELECT ct.chi_tiet_id, ct.phien_ban_id, ct.so_luong,
                ct.gia_tai_thoi_diem, ct.gia_goc_snapshot,
                ct.ten_san_pham_snapshot,
                ct.flash_sale_id_snapshot, ct.flash_sale_ten_snapshot,
                pbsp.ten_phien_ban,
                sp.ten_san_pham, sp.slug,
                (SELECT th.ten_thuong_hieu
                   FROM san_pham_thuong_hieu spth
                   JOIN thuong_hieu th ON th.thuong_hieu_id = spth.thuong_hieu_id
                  WHERE spth.san_pham_id = sp.san_pham_id
                  ORDER BY spth.thuong_hieu_id ASC LIMIT 1) AS ten_thuong_hieu,
                (SELECT url_hinh_anh FROM hinh_anh_san_pham
                 WHERE phien_ban_id = ct.phien_ban_id ORDER BY thu_tu ASC LIMIT 1) AS thumbnail_url
         FROM chi_tiet_don_hang ct
         LEFT JOIN phien_ban_san_pham pbsp ON pbsp.phien_ban_id = ct.phien_ban_id
         LEFT JOIN san_pham sp ON sp.san_pham_id = pbsp.san_pham_id
         WHERE ct.don_hang_id = ?
         ORDER BY ct.chi_tiet_id ASC`,
        [order.id],
      ),
      this.dataSource.query(
        `SELECT ho_ten_nguoi_nhan, so_dien_thoai_nhan, dia_chi_chi_tiet, phuong_xa, quan_huyen, tinh_thanh_pho
         FROM dia_chi_giao_hang WHERE dia_chi_id = ?`,
        [order.diaChiGiaoHangId],
      ),
      this.dataSource.query(`SELECT email FROM khach_hang WHERE khach_hang_id = ?`, [order.khachHangId]),
      this.dataSource.query(
        `SELECT phuong_thuc_thanh_toan AS phuong_thuc, trang_thai_giao_dich AS trang_thai, ngan_hang_vi
         FROM giao_dich WHERE don_hang_id = ? ORDER BY giao_dich_id DESC LIMIT 1`,
        [order.id],
      ),
      this.dataSource.query(
        `SELECT id, khuyen_mai_id, ten, ma_coupon, loai, so_tien_giam
         FROM don_hang_khuyen_mai_ap_dung WHERE don_hang_id = ?
         ORDER BY id ASC`,
        [order.id],
      ),
    ]);

    const addr = addresses[0];
    const customer = customers[0];
    const tx = transactions[0];

    const shippingMethodNames: Record<string, string> = {
      GiaoNhanh: 'Giao hàng nhanh',
      GiaoChuan: 'Giao hàng tiêu chuẩn',
      NhanTaiCuaHang: 'Nhận tại cửa hàng',
    };
    const paymentMethodIdMap: Record<string, { id: string; name: string }> = {
      COD: { id: 'cod', name: 'Thanh toán khi nhận hàng (COD)' },
      ViDienTu: { id: tx?.ngan_hang_vi?.toLowerCase() ?? 'wallet', name: tx?.ngan_hang_vi ?? 'Ví điện tử' },
      ChuyenKhoan: { id: 'bank-transfer', name: 'Chuyển khoản ngân hàng' },
      TheNganHang: { id: 'card', name: 'Thẻ ngân hàng' },
    };
    const paymentStatusMap: Record<string, string> = {
      ChuaThanhToan: 'unpaid',
      DaThanhToan: 'paid',
      DaHoanTien: 'refunded',
      HoanTienMotPhan: 'refunded',
    };

    const placedAt = order.ngayDatHang;
    const eta = order.estimatedDelivery ? new Date(order.estimatedDelivery) : new Date(placedAt.getTime() + 4 * 24 * 60 * 60 * 1000);
    const etaStart = new Date(eta.getTime() - 24 * 60 * 60 * 1000);
    const fmt = (d: Date) => `${d.getDate()}`;
    const estimatedDelivery = `${fmt(etaStart)}–${fmt(eta)} tháng ${eta.getMonth() + 1}, ${eta.getFullYear()}`;
    const estimatedDeliveryIso = eta.toISOString().slice(0, 10);

    const items = lineItems.map((x) => {
      const current = Number(x.gia_tai_thoi_diem);
      const original = x.gia_goc_snapshot != null ? Number(x.gia_goc_snapshot) : current;
      const discountPct = original > current ? Math.round(((original - current) / original) * 100) : 0;
      return {
        id: String(x.chi_tiet_id),
        name: x.ten_san_pham ?? x.ten_san_pham_snapshot,
        slug: x.slug ?? '',
        thumbnailSrc: x.thumbnail_url ?? '',
        brand: x.ten_thuong_hieu ?? '',
        variantLabel: x.ten_phien_ban ?? '',
        quantity: Number(x.so_luong),
        currentPrice: current,
        originalPrice: original,
        discountPct,
        flashSale: x.flash_sale_id_snapshot
          ? { id: Number(x.flash_sale_id_snapshot), name: x.flash_sale_ten_snapshot ?? 'Flash Sale' }
          : null,
      };
    });

    const subtotal = items.reduce((s, i) => s + i.originalPrice * i.quantity, 0);
    const savings = items.reduce((s, i) => s + (i.originalPrice - i.currentPrice) * i.quantity, 0);
    const couponRow = appliedPromos.find((p) => p.loai === 'coupon');
    const couponDiscount = couponRow ? Number(couponRow.so_tien_giam) : Number(order.soTienGiamGia);

    return {
      id: order.maDonHang,
      numericId: order.id,
      placedAt: placedAt.toISOString(),
      estimatedDelivery,
      estimatedDeliveryIso,
      customerEmail: customer?.email ?? '',
      recipient: {
        fullName: addr?.ho_ten_nguoi_nhan ?? '',
        phone: addr?.so_dien_thoai_nhan ?? '',
        email: customer?.email ?? '',
        province: addr?.tinh_thanh_pho ?? '',
        district: addr?.quan_huyen ?? '',
        ward: addr?.phuong_xa ?? '',
        addressDetail: addr?.dia_chi_chi_tiet ?? '',
      },
      shippingMethod: {
        id: order.phuongThucVanChuyen,
        name: shippingMethodNames[order.phuongThucVanChuyen] ?? order.phuongThucVanChuyen,
        price: Number(order.phiVanChuyen),
      },
      paymentMethod: (() => {
        const pmKey = order.phuongThucThanhToan ?? 'COD';
        const meta = paymentMethodIdMap[pmKey] ?? { id: pmKey.toLowerCase(), name: pmKey };
        return { id: meta.id, name: meta.name, status: paymentStatusMap[order.trangThaiThanhToan] ?? 'unpaid' };
      })(),
      items,
      pricing: {
        subtotal,
        savings,
        couponCode: order.maCoupon,
        couponDiscount,
        appliedPromotions: appliedPromos.map((p) => ({
          id: p.khuyen_mai_id,
          name: p.ten,
          type: p.loai,
          amount: Number(p.so_tien_giam),
          maCoupon: p.ma_coupon,
        })),
        shippingFee: Number(order.phiVanChuyen),
        total: Number(order.tongThanhToan),
      },
    };
  }

  private async applyDiscount(
    couponCode: string,
    userId: number,
    tongTien: number,
    cartItems: Array<{ variantId: number; quantity: number; priceAtTime: number }>,
  ): Promise<{ discountAmount: number; promotionId: number; promotionName: string }> {
    const variantIds = cartItems.map((i) => i.variantId);
    const rows: Array<{ phienBanId: number; danhMucId: number | null; brandIds: string | null }> =
      variantIds.length
        ? await this.dataSource.query(
            `SELECT pbsp.phien_ban_id AS phienBanId,
                    sp.danh_muc_id   AS danhMucId,
                    (SELECT GROUP_CONCAT(spth.thuong_hieu_id) FROM san_pham_thuong_hieu spth
                       WHERE spth.san_pham_id = sp.san_pham_id) AS brandIds
             FROM phien_ban_san_pham pbsp
             JOIN san_pham sp ON sp.san_pham_id = pbsp.san_pham_id
             WHERE pbsp.phien_ban_id IN (?)`,
            [variantIds],
          )
        : [];
    const categoryIds = Array.from(new Set(rows.map((r) => Number(r.danhMucId)).filter((x) => Number.isFinite(x))));
    const brandIds = Array.from(
      new Set(
        rows
          .flatMap((r) => (r.brandIds ? r.brandIds.split(',').map((s) => Number(s)) : []))
          .filter((x) => Number.isFinite(x)),
      ),
    );
    const isFirstOrder = await this.checkIsFirstOrder(userId);
    const ctx: EvaluationContext = {
      items: cartItems.map((i) => ({ variantId: i.variantId, quantity: i.quantity, price: Number(i.priceAtTime) })),
      subtotal: tongTien,
      customerId: userId,
      isFirstOrder,
      categoryIds,
      brandIds,
    };
    const result = await this.promotionEvaluator.applyCoupon(couponCode, ctx);
    return { discountAmount: result.discountAmount, promotionId: result.promotionId, promotionName: result.promotionName };
  }

  private async checkIsFirstOrder(userId: number): Promise<boolean> {
    const count = await this.orderRepo.count({ where: { khachHangId: userId } });
    return count === 0;
  }

  /**
   * Atomically consumes the coupon attached to an order, once payment has
   * been confirmed (COD acknowledgement or external gateway webhook).
   * Idempotent — safe to call multiple times. Returns true when consumption
   * was recorded (or already recorded previously).
   */
  async consumeOrderCoupon(orderId: number): Promise<boolean> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) return false;
    if (order.couponConsumed) return true;
    if (!order.khuyenMaiId) return true;
    const ok = await this.promotionsService.recordCouponConsumption(
      order.khuyenMaiId,
      order.khachHangId,
      order.id,
      Number(order.soTienGiamGia),
    );
    if (ok) {
      await this.orderRepo.update(order.id, { couponConsumed: true });
    }
    return ok;
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
