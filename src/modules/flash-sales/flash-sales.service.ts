import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { FlashSale, FlashSaleStatus } from './entities/flash-sale.entity';
import { FlashSaleItem } from './entities/flash-sale-item.entity';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto';
import { UpdateFlashSaleDto } from './dto/update-flash-sale.dto';
import { FlashSaleItemResponseDto, FlashSaleResponseDto } from './dto/flash-sale-response.dto';

@Injectable()
export class FlashSalesService {
  constructor(
    @InjectRepository(FlashSale)
    private readonly flashSaleRepo: Repository<FlashSale>,
    @InjectRepository(FlashSaleItem)
    private readonly itemRepo: Repository<FlashSaleItem>,
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
      assetIdBanner: dto.assetIdBanner ?? null,
      createdBy,
      trangThai: FlashSaleStatus.NHAP,
    });
    const saved = await this.flashSaleRepo.save(flashSale);

    const items = dto.items.map((i) =>
      this.itemRepo.create({
        flashSaleId: saved.id,
        phienBanId: i.phienBanId,
        giaFlash: i.giaFlash,
        giaGocSnapshot: i.giaFlash,
        soLuongGioiHan: i.soLuongGioiHan,
        soLuongDaBan: 0,
        thuTuHienThi: i.thuTuHienThi ?? 1,
      }),
    );
    await this.itemRepo.save(items);
    return this.findOne(saved.id);
  }

  async findAll(): Promise<FlashSaleResponseDto[]> {
    const list = await this.flashSaleRepo.find({ relations: ['items'], order: { batDau: 'DESC' } });
    return list.map((fs) => this.toDto(fs));
  }

  async findOne(id: number): Promise<FlashSaleResponseDto> {
    const fs = await this.flashSaleRepo.findOne({ where: { id }, relations: ['items'] });
    if (!fs) throw new NotFoundException(`Flash sale #${id} không tồn tại`);
    return this.toDto(fs);
  }

  async findActive(): Promise<FlashSaleResponseDto | null> {
    const now = new Date();
    const fs = await this.flashSaleRepo
      .createQueryBuilder('fs')
      .leftJoinAndSelect('fs.items', 'items')
      .where('fs.trangThai = :status', { status: FlashSaleStatus.DANG_DIEN_RA })
      .andWhere('fs.batDau <= :now', { now })
      .andWhere('fs.ketThuc >= :now', { now })
      .orderBy('fs.batDau', 'DESC')
      .getOne();
    return fs ? this.toDto(fs) : null;
  }

  // Internal use only — returns raw entity so callers can read giaFlash / soLuongGioiHan
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
    const fs = await this.flashSaleRepo.findOne({ where: { id }, relations: ['items'] });
    if (!fs) throw new NotFoundException(`Flash sale #${id} không tồn tại`);
    if (fs.trangThai === FlashSaleStatus.DANG_DIEN_RA) {
      throw new BadRequestException('Không thể sửa flash sale đang diễn ra');
    }
    Object.assign(fs, dto);
    await this.flashSaleRepo.save(fs);
    return this.findOne(id);
  }

  async cancel(id: number): Promise<void> {
    await this.findOne(id);
    await this.flashSaleRepo.update(id, { trangThai: FlashSaleStatus.HUY });
  }

  async activateScheduled(): Promise<void> {
    const now = new Date();
    await this.flashSaleRepo
      .createQueryBuilder()
      .update()
      .set({ trangThai: FlashSaleStatus.DANG_DIEN_RA })
      .where('trang_thai = :s', { s: FlashSaleStatus.SAP_DIEN_RA })
      .andWhere('bat_dau <= :now', { now })
      .execute();
  }

  async endExpired(): Promise<void> {
    const now = new Date();
    await this.flashSaleRepo
      .createQueryBuilder()
      .update()
      .set({ trangThai: FlashSaleStatus.DA_KET_THUC })
      .where('trang_thai = :s', { s: FlashSaleStatus.DANG_DIEN_RA })
      .andWhere('ket_thuc < :now', { now })
      .execute();
  }

  async incrementSold(itemId: number, quantity: number): Promise<boolean> {
    const result = await this.dataSource.query(
      `UPDATE flash_sale_item
       SET so_luong_da_ban = so_luong_da_ban + ?
       WHERE flash_sale_item_id = ?
         AND so_luong_da_ban + ? <= so_luong_gioi_han`,
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
      id: fs.id,
      name: fs.ten,
      description: fs.moTa,
      status: fs.trangThai,
      startAt: fs.batDau,
      endAt: fs.ketThuc,
      bannerTitle: fs.bannerTitle,
      bannerImageUrl: fs.bannerImageUrl,
      assetIdBanner: fs.assetIdBanner,
      createdBy: fs.createdBy,
      createdAt: fs.createdAt,
      updatedAt: fs.updatedAt,
      items: (fs.items ?? []).map((i) => this.toItemDto(i)),
    };
  }

  private toItemDto(i: FlashSaleItem): FlashSaleItemResponseDto {
    return {
      id: i.id,
      flashSaleId: i.flashSaleId,
      variantId: i.phienBanId,
      flashPrice: Number(i.giaFlash),
      originalPriceSnapshot: Number(i.giaGocSnapshot),
      quantityLimit: i.soLuongGioiHan,
      quantitySold: i.soLuongDaBan,
      displayOrder: i.thuTuHienThi,
    };
  }
}
