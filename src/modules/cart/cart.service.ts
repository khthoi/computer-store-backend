import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItemResponseDto, CartResponseDto } from './dto/cart-response.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private itemRepo: Repository<CartItem>,
    private dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async getMyCart(userId: number): Promise<CartResponseDto> {
    let cart = await this.cartRepo.findOne({
      where: { khachHangId: userId },
      relations: ['items'],
    });
    if (!cart) {
      cart = await this.cartRepo.save(this.cartRepo.create({ khachHangId: userId, items: [] }));
    }
    return this.buildCartDto(cart);
  }

  async addItem(userId: number, dto: AddCartItemDto): Promise<CartResponseDto> {
    const variant = await this.dataSource.query(
      `SELECT phien_ban_id, gia_ban, trang_thai FROM phien_ban_san_pham WHERE phien_ban_id = ?`,
      [dto.phienBanId],
    );
    if (!variant.length || variant[0].trang_thai === 'An') {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    const stock = await this.getTotalStock(dto.phienBanId);
    if (stock < dto.soLuong) {
      throw new BadRequestException('Số lượng tồn kho không đủ');
    }

    let cart = await this.cartRepo.findOne({
      where: { khachHangId: userId },
      relations: ['items'],
    });
    if (!cart) {
      cart = await this.cartRepo.save(this.cartRepo.create({ khachHangId: userId }));
    }

    const existing = await this.itemRepo.findOne({
      where: { gioHangId: cart.id, phienBanId: dto.phienBanId },
    });

    if (existing) {
      const soLuongCu = existing.soLuong;
      const newQty = existing.soLuong + dto.soLuong;
      if (stock < newQty) throw new BadRequestException('Số lượng tồn kho không đủ');
      existing.soLuong = newQty;
      existing.giaTaiThoiDiem = variant[0].gia_ban;
      await this.itemRepo.save(existing);
      this.auditLogsService.log({
        entityType: 'ChiTietGioHang',
        entityId: String(existing.id),
        entityLabel: `Giỏ hàng #${existing.gioHangId} — phiên bản #${existing.phienBanId}`,
        actionType: 'CapNhat',
        actionDetail: `Khách hàng tăng số lượng sản phẩm (phiên bản #${existing.phienBanId}) trong giỏ hàng từ ${soLuongCu} lên ${existing.soLuong}`,
        before: JSON.stringify({ soLuong: soLuongCu }),
        after: JSON.stringify({ soLuong: existing.soLuong }),
      });
    } else {
      const cartItem = await this.itemRepo.save(
        this.itemRepo.create({
          gioHangId: cart.id,
          phienBanId: dto.phienBanId,
          soLuong: dto.soLuong,
          giaTaiThoiDiem: variant[0].gia_ban,
        }),
      );
      this.auditLogsService.log({
        entityType: 'ChiTietGioHang',
        entityId: String(cartItem.id),
        entityLabel: `Giỏ hàng #${cartItem.gioHangId} — phiên bản #${cartItem.phienBanId}`,
        actionType: 'TaoMoi',
        actionDetail: `Khách hàng thêm sản phẩm (phiên bản #${cartItem.phienBanId}) vào giỏ hàng (số lượng: ${cartItem.soLuong}, giá tại thời điểm: ${cartItem.giaTaiThoiDiem})`,
        after: JSON.stringify({ gioHangId: cartItem.gioHangId, phienBanId: cartItem.phienBanId, soLuong: cartItem.soLuong, giaTaiThoiDiem: cartItem.giaTaiThoiDiem }),
      });
    }

    return this.getMyCart(userId);
  }

  async updateItem(userId: number, itemId: number, dto: UpdateCartItemDto): Promise<CartResponseDto> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['cart'],
    });
    if (!item) throw new NotFoundException('Không tìm thấy mục trong giỏ hàng');
    if (item.cart.khachHangId !== userId) throw new ForbiddenException();

    const stock = await this.getTotalStock(item.phienBanId);
    if (stock < dto.soLuong) throw new BadRequestException('Số lượng tồn kho không đủ');

    const soLuongCu = item.soLuong;
    item.soLuong = dto.soLuong;
    await this.itemRepo.save(item);
    this.auditLogsService.log({
      entityType: 'ChiTietGioHang',
      entityId: String(itemId),
      entityLabel: `Giỏ hàng #${item.gioHangId} — phiên bản #${item.phienBanId}`,
      actionType: 'CapNhat',
      actionDetail: `Khách hàng cập nhật số lượng sản phẩm (phiên bản #${item.phienBanId}) từ ${soLuongCu} thành ${item.soLuong}`,
      before: JSON.stringify({ soLuong: soLuongCu }),
      after: JSON.stringify({ soLuong: item.soLuong }),
    });
    return this.getMyCart(userId);
  }

  async removeItem(userId: number, itemId: number): Promise<CartResponseDto> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['cart'],
    });
    if (!item) throw new NotFoundException('Không tìm thấy mục trong giỏ hàng');
    if (item.cart.khachHangId !== userId) throw new ForbiddenException();

    await this.itemRepo.remove(item);
    this.auditLogsService.log({
      entityType: 'ChiTietGioHang',
      entityId: String(itemId),
      entityLabel: `Giỏ hàng #${item.gioHangId} — phiên bản #${item.phienBanId}`,
      actionType: 'Xoa',
      actionDetail: `Khách hàng xóa sản phẩm (phiên bản #${item.phienBanId}) khỏi giỏ hàng (số lượng lúc xóa: ${item.soLuong})`,
      before: JSON.stringify({ gioHangId: item.gioHangId, phienBanId: item.phienBanId, soLuong: item.soLuong }),
    });
    return this.getMyCart(userId);
  }

  async clearCart(userId: number): Promise<void> {
    const cart = await this.cartRepo.findOne({ where: { khachHangId: userId } });
    if (cart) {
      const soItemBiXoa = await this.itemRepo.count({ where: { gioHangId: cart.id } });
      await this.itemRepo.delete({ gioHangId: cart.id });
      this.auditLogsService.log({
        entityType: 'GioHang',
        entityId: String(cart.id),
        entityLabel: `Giỏ hàng #${cart.id}`,
        actionType: 'Xoa',
        actionDetail: `Khách hàng xóa toàn bộ giỏ hàng (${soItemBiXoa} sản phẩm)`,
        before: JSON.stringify({ soItem: soItemBiXoa, gioHangId: cart.id }),
      });
    }
  }

  private async getTotalStock(phienBanId: number): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT COALESCE(SUM(so_luong_ton), 0) AS tong FROM ton_kho WHERE phien_ban_id = ?`,
      [phienBanId],
    );
    return Number(rows[0]?.tong ?? 0);
  }

  private async buildCartDto(cart: Cart): Promise<CartResponseDto> {
    const items = cart.items ?? [];
    let variantMap = new Map<number, any>();

    if (items.length > 0) {
      const ids = items.map((i) => i.phienBanId);
      const variants = await this.dataSource.query(
        `SELECT pbsp.phien_ban_id, pbsp.ten_phien_ban, pbsp.sku, pbsp.gia_ban, pbsp.trang_thai,
                sp.ten_san_pham, hi.url_hinh_anh
         FROM phien_ban_san_pham pbsp
         JOIN san_pham sp ON sp.san_pham_id = pbsp.san_pham_id
         LEFT JOIN hinh_anh_san_pham hi ON hi.phien_ban_id = pbsp.phien_ban_id AND hi.loai_anh = 'AnhChinh'
         WHERE pbsp.phien_ban_id IN (?)`,
        [ids],
      );
      variantMap = new Map(variants.map((v: any) => [v.phien_ban_id, v]));
    }

    return {
      id: cart.id,
      customerId: cart.khachHangId,
      couponCode: cart.couponCode,
      updatedAt: cart.ngayCapNhat,
      items: items.map((item): CartItemResponseDto => {
        const v = variantMap.get(item.phienBanId);
        return {
          id: item.id,
          variantId: item.phienBanId,
          quantity: item.soLuong,
          priceAtTime: Number(item.giaTaiThoiDiem),
          addedAt: item.ngayThem,
          variant: v
            ? {
                variantId: v.phien_ban_id,
                variantName: v.ten_phien_ban,
                sku: v.sku,
                price: Number(v.gia_ban),
                status: v.trang_thai,
                productName: v.ten_san_pham,
                thumbnail: v.url_hinh_anh ?? null,
              }
            : null,
        };
      }),
    };
  }
}
