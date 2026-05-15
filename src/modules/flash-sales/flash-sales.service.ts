import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
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
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const VARIANT_RELATIONS = ['items', 'items.phienBan', 'items.phienBan.product', 'items.phienBan.images', 'createdByEmployee'];

@Injectable()
export class FlashSalesService implements OnModuleInit {
  private readonly logger = new Logger(FlashSalesService.name);

  /**
   * One-shot data migration: legacy status values (nhap / sap_dien_ra /
   * dang_dien_ra / da_ket_thuc / huy) are mapped to the new active/paused
   * scheme. Idempotent — running on a fresh DB is a no-op.
   */
  async onModuleInit() {
    try {
      const result = await this.dataSource.query(
        `UPDATE flash_sale
            SET trang_thai = CASE
                WHEN trang_thai IN ('nhap', 'huy') THEN 'paused'
                WHEN trang_thai IN ('sap_dien_ra', 'dang_dien_ra', 'da_ket_thuc') THEN 'active'
                ELSE trang_thai
            END
          WHERE trang_thai NOT IN ('active', 'paused')`,
      );
      const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
      if (affected > 0) {
        this.logger.log(`Migrated ${affected} flash_sale row(s) to new status scheme`);
      }
    } catch (err) {
      this.logger.warn(`Flash sale status migration skipped: ${(err as Error).message}`);
    }
  }

  constructor(
    @InjectRepository(FlashSale)
    private readonly flashSaleRepo: Repository<FlashSale>,
    @InjectRepository(FlashSaleItem)
    private readonly itemRepo: Repository<FlashSaleItem>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
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
      trangThai: dto.trangThai ?? FlashSaleStatus.ACTIVE,
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
    this.auditLogsService.log({
      entityType: 'FlashSale',
      entityId: String(saved.id),
      entityLabel: saved.ten,
      actionType: 'TaoMoi',
      actionDetail: `Tạo flash sale ${saved.ten}`,
      after: JSON.stringify({ ten: saved.ten, trangThai: saved.trangThai, batDau: saved.batDau, ketThuc: saved.ketThuc, soLuongSanPham: items.length }),
    });
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

  /**
   * Customer-facing: returns the flash sale that is BOTH approved (status='active')
   * AND currently within its time window. Returns null when no such event exists.
   */
  async findActive(): Promise<FlashSaleResponseDto | null> {
    const now = new Date();
    const fs = await this.flashSaleRepo
      .createQueryBuilder('fs')
      .leftJoinAndSelect('fs.items', 'items')
      .leftJoinAndSelect('items.phienBan', 'pv')
      .leftJoinAndSelect('pv.product', 'p')
      .leftJoinAndSelect('pv.images', 'img')
      .where('fs.trangThai = :status', { status: FlashSaleStatus.ACTIVE })
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
      .andWhere('fs.trangThai = :status', { status: FlashSaleStatus.ACTIVE })
      .andWhere('fs.batDau <= :now', { now })
      .andWhere('fs.ketThuc >= :now', { now })
      .andWhere('fsi.soLuongDaBan < fsi.soLuongGioiHan')
      .getOne();
  }

  async update(id: number, dto: UpdateFlashSaleDto): Promise<FlashSaleResponseDto> {
    const fs = await this.flashSaleRepo.findOne({ where: { id } });
    if (!fs) throw new NotFoundException(`Flash sale #${id} không tồn tại`);

    // Block edits while the event is live and customer-visible. Pause first
    // (status='paused') to modify items/prices without surprising shoppers.
    const now = new Date();
    const isLiveNow =
      fs.trangThai === FlashSaleStatus.ACTIVE &&
      fs.batDau <= now &&
      fs.ketThuc >= now;
    if (isLiveNow && dto.items !== undefined) {
      throw new BadRequestException(
        'Flash sale đang diễn ra trên storefront — vui lòng tạm dừng trước khi sửa danh sách sản phẩm',
      );
    }

    const label = fs.ten;
    const beforeSnapshot = { ten: fs.ten, trangThai: fs.trangThai, batDau: fs.batDau, ketThuc: fs.ketThuc };
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

    this.auditLogsService.log({
      entityType: 'FlashSale',
      entityId: String(id),
      entityLabel: label,
      actionType: 'CapNhat',
      actionDetail: `Cập nhật thông tin ${label}`,
      before: JSON.stringify(beforeSnapshot),
      after: JSON.stringify({ ten: fs.ten, trangThai: fs.trangThai, batDau: fs.batDau, ketThuc: fs.ketThuc, soLuongSanPham: items?.length }),
    });

    return this.findOne(id);
  }

  /**
   * Pause a flash sale (admin-side action). The event will not appear on the
   * storefront until reactivated. Time window remains as configured.
   */
  async pause(id: number): Promise<FlashSaleResponseDto> {
    const fs = await this.flashSaleRepo.findOne({ where: { id } });
    if (!fs) throw new NotFoundException(`Flash sale #${id} không tồn tại`);
    if (fs.trangThai === FlashSaleStatus.PAUSED) {
      throw new BadRequestException('Flash sale đã ở trạng thái tạm dừng');
    }
    const oldStatus = fs.trangThai;
    await this.flashSaleRepo.update(id, { trangThai: FlashSaleStatus.PAUSED });
    this.auditLogsService.log({
      entityType: 'FlashSale',
      entityId: String(id),
      entityLabel: fs.ten,
      actionType: 'DoiTrangThai',
      actionDetail: `Đổi trạng thái ${oldStatus} → ${FlashSaleStatus.PAUSED}`,
      before: JSON.stringify({ trangThai: oldStatus }),
      after: JSON.stringify({ trangThai: FlashSaleStatus.PAUSED }),
    });
    return this.findOne(id);
  }

  /** Reactivate a paused flash sale. */
  async activate(id: number): Promise<FlashSaleResponseDto> {
    const fs = await this.flashSaleRepo.findOne({ where: { id } });
    if (!fs) throw new NotFoundException(`Flash sale #${id} không tồn tại`);
    if (fs.trangThai === FlashSaleStatus.ACTIVE) {
      throw new BadRequestException('Flash sale đã ở trạng thái hoạt động');
    }
    const oldStatus = fs.trangThai;
    await this.flashSaleRepo.update(id, { trangThai: FlashSaleStatus.ACTIVE });
    this.auditLogsService.log({
      entityType: 'FlashSale',
      entityId: String(id),
      entityLabel: fs.ten,
      actionType: 'DoiTrangThai',
      actionDetail: `Đổi trạng thái ${oldStatus} → ${FlashSaleStatus.ACTIVE}`,
      before: JSON.stringify({ trangThai: oldStatus }),
      after: JSON.stringify({ trangThai: FlashSaleStatus.ACTIVE }),
    });
    return this.findOne(id);
  }

  async getStats(): Promise<FlashSaleStatsResponseDto> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86_400_000);
    const [totalEvents, activeNow, upcomingCount, todayCount] = await Promise.all([
      this.flashSaleRepo.count(),
      this.flashSaleRepo
        .createQueryBuilder('fs')
        .where('fs.trangThai = :s', { s: FlashSaleStatus.ACTIVE })
        .andWhere('fs.batDau <= :now', { now })
        .andWhere('fs.ketThuc >= :now', { now })
        .getCount(),
      this.flashSaleRepo
        .createQueryBuilder('fs')
        .where('fs.trangThai = :s', { s: FlashSaleStatus.ACTIVE })
        .andWhere('fs.batDau > :now', { now })
        .getCount(),
      this.flashSaleRepo
        .createQueryBuilder('fs')
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
