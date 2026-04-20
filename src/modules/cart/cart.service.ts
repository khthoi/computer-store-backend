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

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private itemRepo: Repository<CartItem>,
    private dataSource: DataSource,
  ) {}

  async getMyCart(userId: number): Promise<Cart> {
    let cart = await this.cartRepo.findOne({
      where: { khachHangId: userId },
      relations: ['items'],
    });
    if (!cart) {
      cart = this.cartRepo.create({ khachHangId: userId, items: [] });
      await this.cartRepo.save(cart);
    }
    return this.enrichCartItems(cart);
  }

  async addItem(userId: number, dto: AddCartItemDto): Promise<Cart> {
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
      const newQty = existing.soLuong + dto.soLuong;
      if (stock < newQty) throw new BadRequestException('Số lượng tồn kho không đủ');
      existing.soLuong = newQty;
      existing.giaTaiThoiDiem = variant[0].gia_ban;
      await this.itemRepo.save(existing);
    } else {
      await this.itemRepo.save(
        this.itemRepo.create({
          gioHangId: cart.id,
          phienBanId: dto.phienBanId,
          soLuong: dto.soLuong,
          giaTaiThoiDiem: variant[0].gia_ban,
        }),
      );
    }

    return this.getMyCart(userId);
  }

  async updateItem(userId: number, itemId: number, dto: UpdateCartItemDto): Promise<Cart> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['cart'],
    });
    if (!item) throw new NotFoundException('Không tìm thấy mục trong giỏ hàng');
    if (item.cart.khachHangId !== userId) throw new ForbiddenException();

    const stock = await this.getTotalStock(item.phienBanId);
    if (stock < dto.soLuong) throw new BadRequestException('Số lượng tồn kho không đủ');

    item.soLuong = dto.soLuong;
    await this.itemRepo.save(item);
    return this.getMyCart(userId);
  }

  async removeItem(userId: number, itemId: number): Promise<Cart> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['cart'],
    });
    if (!item) throw new NotFoundException('Không tìm thấy mục trong giỏ hàng');
    if (item.cart.khachHangId !== userId) throw new ForbiddenException();

    await this.itemRepo.remove(item);
    return this.getMyCart(userId);
  }

  async clearCart(userId: number): Promise<void> {
    const cart = await this.cartRepo.findOne({ where: { khachHangId: userId } });
    if (cart) {
      await this.itemRepo.delete({ gioHangId: cart.id });
    }
  }

  private async getTotalStock(phienBanId: number): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT COALESCE(SUM(so_luong_ton), 0) AS tong FROM ton_kho WHERE phien_ban_id = ?`,
      [phienBanId],
    );
    return Number(rows[0]?.tong ?? 0);
  }

  private async enrichCartItems(cart: Cart): Promise<Cart> {
    if (!cart.items?.length) return cart;
    const ids = cart.items.map((i) => i.phienBanId);
    const variants = await this.dataSource.query(
      `SELECT pbsp.phien_ban_id, pbsp.ten_phien_ban, pbsp.sku, pbsp.gia_ban, pbsp.trang_thai,
              sp.ten_san_pham, hi.url_hinh_anh
       FROM phien_ban_san_pham pbsp
       JOIN san_pham sp ON sp.san_pham_id = pbsp.san_pham_id
       LEFT JOIN hinh_anh_san_pham hi ON hi.phien_ban_id = pbsp.phien_ban_id AND hi.loai_anh = 'AnhChinh'
       WHERE pbsp.phien_ban_id IN (?)`,
      [ids],
    );
    const variantMap = new Map(variants.map((v: any) => [v.phien_ban_id, v]));
    (cart as any).items = cart.items.map((item) => ({
      ...item,
      variant: variantMap.get(item.phienBanId) ?? null,
    }));
    return cart;
  }
}
