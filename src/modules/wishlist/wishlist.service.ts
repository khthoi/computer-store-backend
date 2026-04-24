import {
  Injectable, ConflictException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { WishlistItem } from './entities/wishlist-item.entity';
import { WishlistItemResponseDto, WishlistResponseDto } from './dto/wishlist-response.dto';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepo: Repository<Wishlist>,
    @InjectRepository(WishlistItem)
    private readonly itemRepo: Repository<WishlistItem>,
    private readonly dataSource: DataSource,
  ) {}

  async getWishlist(customerId: number): Promise<WishlistResponseDto> {
    const wishlist = await this.getOrCreate(customerId);

    const items = await this.itemRepo
      .createQueryBuilder('wi')
      .where('wi.wishlistId = :wishlistId', { wishlistId: wishlist.id })
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

    const variantMap = new Map<number, any>(
      variants.map((v: any) => [v.phien_ban_id, v]),
    );

    return {
      id: wishlist.id,
      items: items.map((item): WishlistItemResponseDto => {
        const v = variantMap.get(item.variantId);
        return {
          id: item.id,
          variantId: item.variantId,
          addedAt: item.addedAt,
          variant: v
            ? {
                variantId: v.phien_ban_id,
                variantName: v.ten_phien_ban,
                price: Number(v.gia_ban),
                status: v.trang_thai,
                productName: v.ten_san_pham,
                slug: v.slug,
                stock: Number(v.stock),
              }
            : null,
        };
      }),
    };
  }

  async addItem(customerId: number, variantId: number): Promise<WishlistItemResponseDto> {
    const wishlist = await this.getOrCreate(customerId);

    const existing = await this.itemRepo.findOne({
      where: { wishlistId: wishlist.id, variantId },
    });
    if (existing) throw new ConflictException('Sản phẩm đã có trong danh sách yêu thích');

    const item = await this.itemRepo.save(
      this.itemRepo.create({ wishlistId: wishlist.id, variantId }),
    );
    return {
      id: item.id,
      variantId: item.variantId,
      addedAt: item.addedAt,
      variant: null,
    };
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
