import {
  Injectable, ConflictException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { WishlistItem } from './entities/wishlist-item.entity';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepo: Repository<Wishlist>,
    @InjectRepository(WishlistItem)
    private readonly itemRepo: Repository<WishlistItem>,
    private readonly dataSource: DataSource,
  ) {}

  async getWishlist(customerId: number) {
    const wishlist = await this.getOrCreate(customerId);

    const items = await this.itemRepo
      .createQueryBuilder('wi')
      .where('wi.wishlist_id = :wishlistId', { wishlistId: wishlist.id })
      .getMany();

    if (items.length === 0) return { id: wishlist.id, items: [] };

    const variantIds = items.map((i) => i.variantId);

    // Fetch variant info + stock status in one query
    const variants = await this.dataSource.query(
      `SELECT v.phien_ban_id, v.ten_phien_ban, v.gia_ban, v.trang_thai,
              sp.ten_san_pham, sp.Slug AS slug,
              COALESCE(tk.so_luong_ton, 0) AS stock
       FROM phien_ban_san_pham v
       INNER JOIN san_pham sp ON sp.san_pham_id = v.san_pham_id
       LEFT JOIN ton_kho tk ON tk.phien_ban_id = v.phien_ban_id
       WHERE v.phien_ban_id IN (?)`,
      [variantIds],
    );

    const variantMap = new Map<number, Record<string, unknown>>(
      variants.map((v: Record<string, unknown>) => [v.phien_ban_id as number, v]),
    );

    return {
      id: wishlist.id,
      items: items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        addedAt: item.addedAt,
        variant: variantMap.get(item.variantId) ?? null,
      })),
    };
  }

  async addItem(customerId: number, variantId: number): Promise<WishlistItem> {
    const wishlist = await this.getOrCreate(customerId);

    const existing = await this.itemRepo.findOne({
      where: { wishlistId: wishlist.id, variantId },
    });
    if (existing) throw new ConflictException('Sản phẩm đã có trong danh sách yêu thích');

    const item = this.itemRepo.create({ wishlistId: wishlist.id, variantId });
    return this.itemRepo.save(item);
  }

  async removeItem(customerId: number, variantId: number): Promise<void> {
    const wishlist = await this.getOrCreate(customerId);

    const item = await this.itemRepo.findOne({
      where: { wishlistId: wishlist.id, variantId },
    });
    if (!item) throw new NotFoundException('Sản phẩm không có trong danh sách yêu thích');

    await this.itemRepo.remove(item);
  }

  private async getOrCreate(customerId: number): Promise<Wishlist> {
    let wishlist = await this.wishlistRepo.findOne({ where: { customerId } });
    if (!wishlist) {
      wishlist = await this.wishlistRepo.save(
        this.wishlistRepo.create({ customerId }),
      );
    }
    return wishlist;
  }
}
