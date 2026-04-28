import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { StockLevel } from './entities/stock-level.entity';
import { StockHistory, LoaiGiaoDich } from './entities/stock-history.entity';
import { QueryStockDto } from './dto/query-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(StockLevel)
    private readonly stockRepo: Repository<StockLevel>,
    @InjectRepository(StockHistory)
    private readonly historyRepo: Repository<StockHistory>,
    private readonly dataSource: DataSource,
  ) {}

  findAllWarehouses() {
    return this.warehouseRepo.find({ where: { trangThai: 'HoatDong' } });
  }

  async findStockLevels(query: QueryStockDto) {
    const qb = this.stockRepo
      .createQueryBuilder('tk')
      .orderBy('tk.so_luong_ton', 'ASC')
      .skip(((query.page ?? 1) - 1) * (query.limit ?? 20))
      .take(query.limit ?? 20);

    if (query.khoId) qb.andWhere('tk.kho_id = :khoId', { khoId: query.khoId });
    if (query.lowStockOnly) qb.andWhere('tk.so_luong_ton < tk.nguong_canh_bao');

    const [data, total] = await qb.getManyAndCount();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  findStockByVariant(phienBanId: number) {
    return this.stockRepo.find({ where: { phienBanId } });
  }

  findHistoryByVariant(phienBanId: number) {
    return this.historyRepo.find({
      where: { phienBanId },
      order: { thoiDiem: 'DESC' },
      take: 100,
    });
  }

  async adjustStock(dto: AdjustStockDto, nguoiThucHienId: number): Promise<StockHistory> {
    return this.dataSource.transaction(async (manager) => {
      await this.upsertStockLevel(manager, dto.phienBanId, dto.khoId, dto.soLuong);
      return this.writeHistory(manager, {
        phienBanId: dto.phienBanId,
        khoId: dto.khoId,
        loaiGiaoDich: dto.loaiGiaoDich as LoaiGiaoDich,
        soLuong: dto.soLuong,
        nguoiThucHienId,
        ghiChu: dto.ghiChu ?? null,
      });
    });
  }

  async recordMovement(
    manager: EntityManager,
    params: {
      phienBanId: number;
      khoId: number;
      soLuong: number;
      loaiGiaoDich: LoaiGiaoDich;
      donHangId?: number;
      phieuNhapId?: number;
      nguoiThucHienId: number | null;
      ghiChu?: string;
    },
  ): Promise<void> {
    await this.writeHistory(manager, {
      phienBanId: params.phienBanId,
      khoId: params.khoId,
      loaiGiaoDich: params.loaiGiaoDich,
      soLuong: params.soLuong,
      donHangId: params.donHangId ?? null,
      phieuNhapId: params.phieuNhapId ?? null,
      nguoiThucHienId: params.nguoiThucHienId,
      ghiChu: params.ghiChu ?? null,
    });
  }

  async upsertStockLevel(
    manager: EntityManager,
    phienBanId: number,
    khoId: number,
    delta: number,
  ): Promise<void> {
    const existing = await manager.findOne(StockLevel, { where: { phienBanId, khoId } });
    if (existing) {
      const newQty = existing.soLuongTon + delta;
      if (newQty < 0) throw new BadRequestException('Tồn kho không đủ để thực hiện thao tác');
      existing.soLuongTon = newQty;
      await manager.save(StockLevel, existing);
    } else {
      if (delta < 0) throw new BadRequestException('Tồn kho không đủ để thực hiện thao tác');
      await manager.save(StockLevel, manager.create(StockLevel, { phienBanId, khoId, soLuongTon: delta }));
    }
  }

  private writeHistory(
    manager: EntityManager,
    data: Partial<StockHistory>,
  ): Promise<StockHistory> {
    return manager.save(StockHistory, manager.create(StockHistory, data));
  }

  async findLowStockVariants(): Promise<StockLevel[]> {
    return this.stockRepo
      .createQueryBuilder('tk')
      .where('tk.so_luong_ton < tk.nguong_canh_bao')
      .getMany();
  }
}
