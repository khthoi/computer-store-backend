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

  async getWishlist(
    customerId: number,
    pageOpts: { page?: number; limit?: number } = {},
  ): Promise<WishlistResponseDto> {
    const wishlist = await this.getOrCreate(customerId);

    const page = Math.max(1, Number(pageOpts.page) || 1);
    const limit = Math.max(1, Math.min(1000, Number(pageOpts.limit) || 10));

    const [items, total] = await this.itemRepo
      .createQueryBuilder('wi')
      .where('wi.wishlistId = :wishlistId', { wishlistId: wishlist.id })
      .orderBy('wi.addedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    if (items.length === 0) {
      return {
        id: wishlist.id,
        items: [],
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }

    const variantIds = items.map((i) => i.variantId);

    // Fetch variant info + stock status in one query
    const variants = await this.dataSource.query(
      `SELECT v.phien_ban_id, v.ten_phien_ban, v.sku, v.gia_ban, v.gia_goc, v.trang_thai,
              sp.san_pham_id, sp.ten_san_pham, sp.slug AS slug,
              dm.ten_danh_muc AS category_name,
              COALESCE(tk.so_luong_ton, 0) AS stock,
              (SELECT _h.url_hinh_anh
                 FROM hinh_anh_san_pham _h
                 WHERE _h.phien_ban_id = v.phien_ban_id
                   AND _h.url_hinh_anh IS NOT NULL
                 ORDER BY FIELD(_h.loai_anh, 'AnhChinh', 'AnhPhu') ASC, _h.thu_tu ASC
                 LIMIT 1) AS image_url
       FROM phien_ban_san_pham v
       INNER JOIN san_pham sp ON sp.san_pham_id = v.san_pham_id
       LEFT JOIN danh_muc dm ON dm.danh_muc_id = sp.danh_muc_id
       LEFT JOIN ton_kho tk ON tk.phien_ban_id = v.phien_ban_id
       WHERE v.phien_ban_id IN (?)`,
      [variantIds],
    );

    const variantMap = new Map<number, any>(
      variants.map((v: any) => [v.phien_ban_id, v]),
    );

    const productIds = Array.from(
      new Set(variants.map((v: any) => Number(v.san_pham_id))),
    );

    const brandRows: Array<{ san_pham_id: number; ten_thuong_hieu: string }> =
      productIds.length > 0
        ? await this.dataSource.query(
            `SELECT spth.san_pham_id, th.ten_thuong_hieu
             FROM san_pham_thuong_hieu spth
             INNER JOIN thuong_hieu th ON th.thuong_hieu_id = spth.thuong_hieu_id
             WHERE spth.san_pham_id IN (?)
             ORDER BY th.ten_thuong_hieu ASC`,
            [productIds],
          )
        : [];

    const brandsByProduct = new Map<number, string[]>();
    for (const row of brandRows) {
      const pid = Number(row.san_pham_id);
      const list = brandsByProduct.get(pid) ?? [];
      list.push(row.ten_thuong_hieu);
      brandsByProduct.set(pid, list);
    }

    return {
      id: wishlist.id,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
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
                sku: v.sku,
                price: Number(v.gia_ban),
                originalPrice: Number(v.gia_goc),
                status: v.trang_thai,
                productName: v.ten_san_pham,
                slug: v.slug,
                stock: Number(v.stock),
                imageUrl: v.image_url ?? null,
                categoryName: v.category_name ?? null,
                brands: brandsByProduct.get(Number(v.san_pham_id)) ?? [],
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
