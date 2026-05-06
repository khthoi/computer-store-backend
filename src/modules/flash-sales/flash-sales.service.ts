import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { FlashSale, FlashSaleStatus } from './entities/flash-sale.entity';
import { FlashSaleItem } from './entities/flash-sale-item.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { LoaiAnh } from '../products/entities/product-image.entity';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto';
import { UpdateFlashSaleDto } from './dto/update-flash-sale.dto';
import { QueryFlashSaleDto } from './dto/query-flash-sale.dto';
import {
  FlashSaleResponseDto,
  FlashSaleItemResponseDto,
  FlashSaleSummaryResponseDto,
  FlashSaleStatsResponseDto,
  VariantSearchResultResponseDto,
} from './dto/flash-sale-response.dto';

const VARIANT_RELATIONS = ['items', 'items.phienBan', 'items.phienBan.product', 'items.phienBan.images', 'createdByEmployee'];

@Injectable()
export class FlashSalesService {
  constructor(
    @InjectRepository(FlashSale)
    private readonly flashSaleRepo: Repository<FlashSale>,
    @InjectRepository(FlashSaleItem)
    private readonly itemRepo: Repository<FlashSaleItem>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateFlashSaleDto, createdBy: number): Promise<FlashSaleResponseDto> {
    const flashSale = this.flashSaleRepo.create({
      ten: dto.ten,
      moTa: dto.moTa ?? null,
      batDau: dto.batDau,
      ketThuc: dto.ketThuc,
      bannerTitle: dto.bannerTitle ?? null,
      bannerImageUrl: dto.bannerImageUrl ?? null,
      bannerAlt: dto.bannerAlt ?? null,
      assetIdBanner: dto.assetIdBanner ?? null,
      createdBy,
      trangThai: dto.trangThai ?? FlashSaleStatus.NHAP,
    });
    const saved = await this.flashSaleRepo.save(flashSale);

    const ids = dto.items.map((i) => i.phienBanId);
    const variants = await this.variantRepo.findBy({ id: In(ids) });
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    const items = dto.items.map((i) =>
      this.itemRepo.create({
        flashSaleId: saved.id,
        phienBanId: i.phienBanId,
        giaFlash: i.giaFlash,
        giaGocSnapshot: Number(variantMap.get(i.phienBanId)?.giaBan ?? i.giaFlash),
        soLuongGioiHan: i.soLuongGioiHan,
        soLuongDaBan: 0,
        thuTuHienThi: i.thuTuHienThi ?? 1,
      }),
    );
    await this.itemRepo.save(items);
    return this.findOne(saved.id);
  }

  async findAll(query: QueryFlashSaleDto): Promise<{ data: FlashSaleSummaryResponseDto[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.flashSaleRepo
      .createQueryBuilder('fs')
      .leftJoinAndSelect('fs.items', 'items')
      .orderBy('fs.batDau', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (query.status) qb.andWhere('fs.trangThai = :status', { status: query.status });
    if (query.search) qb.andWhere('fs.ten LIKE :search', { search: `%${query.search}%` });
    const [list, total] = await qb.getManyAndCount();
    return { data: list.map((fs) => this.toSummaryDto(fs)), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number): Promise<FlashSaleResponseDto> {
    const fs = await this.flashSaleRepo.findOne({ where: { id }, relations: VARIANT_RELATIONS });
    if (!fs) throw new NotFoundException(`Flash sale #${id} không tồn tại`);
    return this.toDto(fs);
  }

  async findActive(): Promise<FlashSaleResponseDto | null> {
    const now = new Date();
    const fs = await this.flashSaleRepo
      .createQueryBuilder('fs')
      .leftJoinAndSelect('fs.items', 'items')
      .leftJoinAndSelect('items.phienBan', 'pv')
      .leftJoinAndSelect('pv.product', 'p')
      .leftJoinAndSelect('pv.images', 'img')
      .where('fs.trangThai = :status', { status: FlashSaleStatus.DANG_DIEN_RA })
      .andWhere('fs.batDau <= :now', { now })
      .andWhere('fs.ketThuc >= :now', { now })
      .orderBy('fs.batDau', 'DESC')
      .getOne();
    return fs ? this.toDto(fs) : null;
  }

  async findActiveItemForVariant(phienBanId: number): Promise<FlashSaleItem | null> {
    const now = new Date();
    return this.itemRepo
      .createQueryBuilder('fsi')
      .innerJoin('fsi.flashSale', 'fs')
      .where('fsi.phienBanId = :phienBanId', { phienBanId })
      .andWhere('fs.trangThai = :status', { status: FlashSaleStatus.DANG_DIEN_RA })
      .andWhere('fs.batDau <= :now', { now })
      .andWhere('fs.ketThuc >= :now', { now })
      .andWhere('fsi.soLuongDaBan < fsi.soLuongGioiHan')
      .getOne();
  }

  async update(id: number, dto: UpdateFlashSaleDto): Promise<FlashSaleResponseDto> {
    const fs = await this.flashSaleRepo.findOne({ where: { id } });
    if (!fs) throw new NotFoundException(`Flash sale #${id} không tồn tại`);
    if (fs.trangThai === FlashSaleStatus.DANG_DIEN_RA) {
      throw new BadRequestException('Không thể sửa flash sale đang diễn ra');
    }
    const { items, ...fsFields } = dto;
    Object.assign(fs, fsFields);
    await this.flashSaleRepo.save(fs);

    if (items !== undefined) {
      await this.itemRepo.delete({ flashSaleId: id });
      const ids = items.map((i) => i.phienBanId);
      const variants = await this.variantRepo.findBy({ id: In(ids) });
      const variantMap = new Map(variants.map((v) => [v.id, v]));
      const newItems = items.map((i) =>
        this.itemRepo.create({
          flashSaleId: id,
          phienBanId: i.phienBanId,
          giaFlash: i.giaFlash,
          giaGocSnapshot: Number(variantMap.get(i.phienBanId)?.giaBan ?? i.giaFlash),
          soLuongGioiHan: i.soLuongGioiHan,
          thuTuHienThi: i.thuTuHienThi ?? 1,
        }),
      );
      await this.itemRepo.save(newItems);
    }

    return this.findOne(id);
  }

  async cancel(id: number): Promise<void> {
    await this.findOne(id);
    await this.flashSaleRepo.update(id, { trangThai: FlashSaleStatus.HUY });
  }

  async endEarly(id: number): Promise<FlashSaleResponseDto> {
    const fs = await this.flashSaleRepo.findOne({ where: { id } });
    if (!fs) throw new NotFoundException(`Flash sale #${id} không tồn tại`);
    if (fs.trangThai === FlashSaleStatus.DA_KET_THUC || fs.trangThai === FlashSaleStatus.HUY) {
      throw new BadRequestException('Flash sale đã kết thúc hoặc bị hủy');
    }
    await this.flashSaleRepo.update(id, { trangThai: FlashSaleStatus.DA_KET_THUC });
    return this.findOne(id);
  }

  async getStats(): Promise<FlashSaleStatsResponseDto> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86_400_000);
    const [totalEvents, activeNow, upcomingCount, todayCount] = await Promise.all([
      this.flashSaleRepo.count(),
      this.flashSaleRepo.count({ where: { trangThai: FlashSaleStatus.DANG_DIEN_RA } }),
      this.flashSaleRepo.count({ where: { trangThai: FlashSaleStatus.SAP_DIEN_RA } }),
      this.flashSaleRepo.createQueryBuilder('fs')
        .where('fs.batDau >= :today AND fs.batDau < :tomorrow', { today, tomorrow })
        .getCount(),
    ]);
    return { totalEvents, activeNow, upcomingCount, todayCount };
  }

  async searchVariants(query: string, excludeIds: number[] = []): Promise<VariantSearchResultResponseDto[]> {
    if (!query.trim()) return [];
    const qb = this.variantRepo
      .createQueryBuilder('pv')
      .leftJoinAndSelect('pv.product', 'p')
      .leftJoinAndSelect('pv.images', 'img')
      .leftJoinAndSelect('pv.stockLevel', 'sl')
      .where('pv.trangThai = :trangThai', { trangThai: 'HienThi' })
      .andWhere('(pv.tenPhienBan LIKE :q OR pv.sku LIKE :q OR p.tenSanPham LIKE :q)', { q: `%${query.trim()}%` })
      .take(20);
    if (excludeIds.length) qb.andWhere('pv.id NOT IN (:...excludeIds)', { excludeIds });
    const variants = await qb.getMany();
    return variants.map((pv) => {
      const mainImg = pv.images?.find((img) => img.loaiAnh === LoaiAnh.AnhChinh) ?? pv.images?.[0];
      return {
        phienBanId: pv.id,
        sanPhamId: pv.sanPhamId,
        tenPhienBan: pv.tenPhienBan,
        sku: pv.sku,
        sanPhamTen: pv.product?.tenSanPham ?? '',
        hinhAnh: mainImg?.urlHinhAnh,
        giaBan: Number(pv.giaBan),
        giaGoc: pv.giaGoc != null ? Number(pv.giaGoc) : undefined,
        trangThai: pv.trangThai,
        tonKho: pv.stockLevel?.soLuongTon ?? 0,
      };
    });
  }

  async activateScheduled(): Promise<void> {
    const now = new Date();
    await this.flashSaleRepo.createQueryBuilder().update()
      .set({ trangThai: FlashSaleStatus.DANG_DIEN_RA })
      .where('trang_thai = :s AND bat_dau <= :now', { s: FlashSaleStatus.SAP_DIEN_RA, now })
      .execute();
  }

  async endExpired(): Promise<void> {
    const now = new Date();
    await this.flashSaleRepo.createQueryBuilder().update()
      .set({ trangThai: FlashSaleStatus.DA_KET_THUC })
      .where('trang_thai = :s AND ket_thuc < :now', { s: FlashSaleStatus.DANG_DIEN_RA, now })
      .execute();
  }

  async incrementSold(itemId: number, quantity: number): Promise<boolean> {
    const result = await this.dataSource.query(
      `UPDATE flash_sale_item SET so_luong_da_ban = so_luong_da_ban + ?
       WHERE flash_sale_item_id = ? AND so_luong_da_ban + ? <= so_luong_gioi_han`,
      [quantity, itemId, quantity],
    );
    return result.affectedRows > 0;
  }

  async decrementSold(itemId: number, quantity: number): Promise<void> {
    await this.dataSource.query(
      `UPDATE flash_sale_item SET so_luong_da_ban = GREATEST(0, so_luong_da_ban - ?) WHERE flash_sale_item_id = ?`,
      [quantity, itemId],
    );
  }

  private toDto(fs: FlashSale): FlashSaleResponseDto {
    return {
      flashSaleId: fs.id,
      ten: fs.ten,
      moTa: fs.moTa ?? undefined,
      trangThai: fs.trangThai,
      batDau: fs.batDau.toISOString(),
      ketThuc: fs.ketThuc.toISOString(),
      bannerTitle: fs.bannerTitle ?? undefined,
      bannerImageUrl: fs.bannerImageUrl ?? undefined,
      bannerAlt: fs.bannerAlt ?? undefined,
      createdByEmployeeId: fs.createdBy,
      createdBy: fs.createdByEmployee?.hoTen ?? String(fs.createdBy),
      createdByEmail: fs.createdByEmployee?.email ?? undefined,
      createdAt: fs.createdAt.toISOString(),
      updatedAt: fs.updatedAt.toISOString(),
      items: (fs.items ?? []).map((i) => this.toItemDto(i)),
    };
  }

  private toItemDto(i: FlashSaleItem): FlashSaleItemResponseDto {
    const pv = i.phienBan;
    const mainImg = pv?.images?.find((img) => img.loaiAnh === LoaiAnh.AnhChinh) ?? pv?.images?.[0];
    return {
      flashSaleItemId: i.id,
      flashSaleId: i.flashSaleId,
      phienBanId: i.phienBanId,
      sanPhamId: pv?.sanPhamId,
      tenPhienBan: pv?.tenPhienBan ?? '',
      skuSnapshot: pv?.sku ?? '',
      sanPhamTen: pv?.product?.tenSanPham ?? '',
      hinhAnh: mainImg?.urlHinhAnh,
      giaFlash: Number(i.giaFlash),
      giaGocSnapshot: Number(i.giaGocSnapshot),
      giaGoc: pv?.giaGoc != null ? Number(pv.giaGoc) : undefined,
      soLuongGioiHan: i.soLuongGioiHan,
      soLuongDaBan: i.soLuongDaBan,
      thuTuHienThi: i.thuTuHienThi,
    };
  }

  private toSummaryDto(fs: FlashSale): FlashSaleSummaryResponseDto {
    const items = fs.items ?? [];
    return {
      flashSaleId: fs.id,
      ten: fs.ten,
      trangThai: fs.trangThai,
      batDau: fs.batDau.toISOString(),
      ketThuc: fs.ketThuc.toISOString(),
      soLuongPhienBan: items.length,
      tongSanPhamDaBan: items.reduce((s, i) => s + i.soLuongDaBan, 0),
      tongGioiHan: items.reduce((s, i) => s + i.soLuongGioiHan, 0),
      createdAt: fs.createdAt.toISOString(),
    };
  }
}
