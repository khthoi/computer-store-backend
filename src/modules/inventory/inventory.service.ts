import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { StockLevel } from './entities/stock-level.entity';
import { StockHistory, LoaiGiaoDich } from './entities/stock-history.entity';
import { QueryStockDto } from './dto/query-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { QueryHistoryDto } from './dto/query-history.dto';
import { UpdateThresholdsDto } from './dto/inventory-item-response.dto';
import { BatchService } from './batch.service';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(StockLevel)
    private readonly stockRepo: Repository<StockLevel>,
    @InjectRepository(StockHistory)
    private readonly historyRepo: Repository<StockHistory>,
    private readonly dataSource: DataSource,
    private readonly batchService: BatchService,
  ) {}

  // ─── Stock Level List (enriched) ─────────────────────────────────────────────

  async findStockLevels(query: QueryStockDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Count query (no selects / pagination, just filters)
    const countQb = this.stockRepo
      .createQueryBuilder('tk')
      .leftJoin('phien_ban_san_pham', 'pb', 'pb.phien_ban_id = tk.phien_ban_id')
      .leftJoin('san_pham', 'sp', 'sp.san_pham_id = pb.san_pham_id');
    this.applyStockFilters(countQb, query);
    const total = await countQb.getCount();

    // Data query with all JOINs and subqueries
    const sortCol = this.resolveSortColumn(query.sortKey ?? 'updatedAt');
    const sortDir = (query.sortDir === 'asc' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';

    const qb = this.stockRepo
      .createQueryBuilder('tk')
      .select('tk.ton_kho_id', 'id')
      .addSelect('tk.phien_ban_id', 'variantId')
      .addSelect('pb.san_pham_id', 'productId')
      .addSelect('sp.ten_san_pham', 'productName')
      .addSelect('pb.ten_phien_ban', 'variantName')
      .addSelect('pb.sku', 'sku')
      .addSelect('COALESCE(pb.gia_ban, 0)', 'sellingPrice')
      .addSelect('COALESCE(tk.so_luong_ton, 0)', 'quantityOnHand')
      .addSelect(
        `(SELECT COALESCE(SUM(ct.so_luong), 0)
          FROM chi_tiet_don_hang ct
          INNER JOIN don_hang dh ON dh.don_hang_id = ct.don_hang_id
          WHERE ct.phien_ban_id = tk.phien_ban_id
            AND dh.trang_thai_don IN ('ChoTT', 'DaXacNhan', 'DongGoi', 'DangGiao'))`,
        'quantityReserved',
      )
      .addSelect('COALESCE(tk.gia_von_trung_binh, 0)', 'costPrice')
      .addSelect('COALESCE(tk.nguong_canh_bao, 0)', 'lowStockThreshold')
      .addSelect('tk.ngay_cap_nhat', 'updatedAt')
      .addSelect(
        `(SELECT img.url_hinh_anh FROM hinh_anh_san_pham img
          WHERE img.phien_ban_id = tk.phien_ban_id
          ORDER BY CASE WHEN img.loai_anh = 'AnhChinh' THEN 0 ELSE 1 END, img.thu_tu ASC
          LIMIT 1)`,
        'thumbnailUrl',
      )
      .addSelect(
        `(SELECT pnk.nha_cung_cap_id FROM phieu_nhap_kho pnk
          INNER JOIN chi_tiet_phieu_nhap ctpn ON ctpn.phieu_nhap_id = pnk.phieu_nhap_id
          WHERE ctpn.phien_ban_id = tk.phien_ban_id AND pnk.nha_cung_cap_id IS NOT NULL
          ORDER BY pnk.ngay_nhap DESC LIMIT 1)`,
        'supplierId',
      )
      .addSelect(
        `(SELECT ncc.ten_nha_cung_cap FROM phieu_nhap_kho pnk
          INNER JOIN chi_tiet_phieu_nhap ctpn ON ctpn.phieu_nhap_id = pnk.phieu_nhap_id
          INNER JOIN nha_cung_cap ncc ON ncc.nha_cung_cap_id = pnk.nha_cung_cap_id
          WHERE ctpn.phien_ban_id = tk.phien_ban_id AND pnk.nha_cung_cap_id IS NOT NULL
          ORDER BY pnk.ngay_nhap DESC LIMIT 1)`,
        'supplierName',
      )
      .addSelect(
        `(SELECT MAX(lsnx.thoi_diem) FROM lich_su_nhap_xuat lsnx
          WHERE lsnx.phien_ban_id = tk.phien_ban_id AND lsnx.loai_giao_dich = 'Nhap')`,
        'lastRestockedAt',
      )
      .leftJoin('phien_ban_san_pham', 'pb', 'pb.phien_ban_id = tk.phien_ban_id')
      .leftJoin('san_pham', 'sp', 'sp.san_pham_id = pb.san_pham_id')
      .orderBy(sortCol, sortDir)
      .offset((page - 1) * limit)
      .limit(limit);

    this.applyStockFilters(qb, query);
    const rows = await qb.getRawMany();
    const data = rows.map((r) => this.mapToInventoryItem(r));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private resolveSortColumn(sortKey: string): string {
    const map: Record<string, string> = {
      productName: 'sp.ten_san_pham',
      sku: 'pb.sku',
      quantityOnHand: 'tk.so_luong_ton',
      lowStockThreshold: 'tk.nguong_canh_bao',
      costPrice: 'tk.gia_von_trung_binh',
      sellingPrice: 'pb.gia_ban',
      updatedAt: 'tk.ngay_cap_nhat',
    };
    return map[sortKey] ?? 'tk.ngay_cap_nhat';
  }

  private applyStockFilters(qb: SelectQueryBuilder<StockLevel>, query: QueryStockDto): void {
    if (query.q?.trim()) {
      qb.andWhere('(sp.ten_san_pham LIKE :q OR pb.sku LIKE :q)', { q: `%${query.q.trim()}%` });
    }
    if (query.alertLevel) {
      if (query.alertLevel === 'out_of_stock_inv') {
        qb.andWhere('tk.so_luong_ton = 0');
      } else if (query.alertLevel === 'low_stock') {
        qb.andWhere('(tk.so_luong_ton > 0 AND tk.so_luong_ton < tk.nguong_canh_bao)');
      } else if (query.alertLevel === 'ok') {
        qb.andWhere('(tk.so_luong_ton > 0 AND tk.so_luong_ton >= tk.nguong_canh_bao)');
      }
    }
    if (query.lowStockOnly) {
      qb.andWhere('tk.so_luong_ton < tk.nguong_canh_bao');
    }
    if (query.categoryId) {
      qb.andWhere('sp.danh_muc_id = :categoryId', { categoryId: query.categoryId });
    }
    if (query.supplierId) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM phieu_nhap_kho pnk2
          INNER JOIN chi_tiet_phieu_nhap ctpn2 ON ctpn2.phieu_nhap_id = pnk2.phieu_nhap_id
          WHERE ctpn2.phien_ban_id = tk.phien_ban_id AND pnk2.nha_cung_cap_id = :supplierId
        )`,
        { supplierId: query.supplierId },
      );
    }
  }

  private mapToInventoryItem(r: Record<string, unknown>) {
    const onHand = Number(r['quantityOnHand'] ?? 0);
    const reserved = Number(r['quantityReserved'] ?? 0);
    const threshold = Number(r['lowStockThreshold'] ?? 0);
    const alertLevel: 'ok' | 'low_stock' | 'out_of_stock_inv' =
      onHand === 0 ? 'out_of_stock_inv' : onHand < threshold ? 'low_stock' : 'ok';

    return {
      id: String(r['id']),
      variantId: String(r['variantId']),
      productId: r['productId'] != null ? String(r['productId']) : '',
      productName: (r['productName'] as string) ?? '',
      variantName: (r['variantName'] as string) ?? '',
      sku: (r['sku'] as string) ?? '',
      thumbnailUrl: (r['thumbnailUrl'] as string) ?? undefined,
      supplierId: r['supplierId'] != null ? String(r['supplierId']) : undefined,
      supplierName: (r['supplierName'] as string) ?? undefined,
      quantityOnHand: onHand,
      quantityReserved: reserved,
      quantityAvailable: onHand,
      lowStockThreshold: threshold,
      costPrice: Number(r['costPrice'] ?? 0),
      sellingPrice: Number(r['sellingPrice'] ?? 0),
      alertLevel,
      lastRestockedAt:
        r['lastRestockedAt'] != null
          ? new Date(r['lastRestockedAt'] as string).toISOString()
          : undefined,
      updatedAt:
        r['updatedAt'] != null
          ? new Date(r['updatedAt'] as string).toISOString()
          : new Date().toISOString(),
    };
  }

  // ─── Inventory Summary (stats bar) ───────────────────────────────────────────

  async getInventorySummary() {
    const stats = await this.stockRepo
      .createQueryBuilder('tk')
      .select('COUNT(*)', 'totalSkus')
      .addSelect('COALESCE(SUM(tk.so_luong_ton), 0)', 'totalUnits')
      .addSelect(
        `SUM(CASE WHEN tk.so_luong_ton > 0 AND tk.so_luong_ton < tk.nguong_canh_bao THEN 1 ELSE 0 END)`,
        'lowStockCount',
      )
      .addSelect('SUM(CASE WHEN tk.so_luong_ton = 0 THEN 1 ELSE 0 END)', 'outOfStockCount')
      .addSelect('COALESCE(SUM(tk.so_luong_ton * tk.gia_von_trung_binh), 0)', 'totalInventoryValue')
      .getRawOne();

    return {
      totalSkus: Number(stats?.totalSkus ?? 0),
      totalUnits: Number(stats?.totalUnits ?? 0),
      lowStockCount: Number(stats?.lowStockCount ?? 0),
      outOfStockCount: Number(stats?.outOfStockCount ?? 0),
      totalInventoryValue: Number(stats?.totalInventoryValue ?? 0),
      pendingStockIn: 0,
      pendingReturns: 0,
    };
  }

  // ─── Update Thresholds ────────────────────────────────────────────────────────

  async updateThresholds(phienBanId: number, dto: UpdateThresholdsDto) {
    const sl = await this.stockRepo.findOne({ where: { phienBanId } });
    if (!sl) throw new NotFoundException(`Stock level not found for variant ${phienBanId}`);
    sl.nguongCanhBao = dto.lowStockThreshold;
    sl.reorderPoint = dto.reorderPoint;
    await this.stockRepo.save(sl);
    return { success: true };
  }

  async findStockLevelByVariant(phienBanId: number) {
    const sl = await this.stockRepo.findOne({ where: { phienBanId } });
    const qty = sl?.soLuongTon ?? 0;
    const threshold = sl?.nguongCanhBao ?? 0;
    const alertLevel: 'ok' | 'low_stock' | 'out_of_stock_inv' =
      qty === 0 ? 'out_of_stock_inv' : qty < threshold ? 'low_stock' : 'ok';
    return {
      quantityOnHand: qty,
      lowStockThreshold: threshold,
      averageCostPrice: Number(sl?.giaVonTrungBinh ?? 0),
      reorderPoint: sl?.reorderPoint ?? 0,
      alertLevel,
      updatedAt: sl?.ngayCapNhat?.toISOString() ?? null,
    };
  }

  async findHistoryByVariant(phienBanId: number, query: QueryHistoryDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.historyRepo
      .createQueryBuilder('h')
      .where('h.phien_ban_id = :phienBanId', { phienBanId })
      .orderBy('h.thoi_diem', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.startDate) qb.andWhere('h.thoi_diem >= :startDate', { startDate: query.startDate });
    if (query.endDate) qb.andWhere('h.thoi_diem <= :endDate', { endDate: query.endDate });
    if (query.loaiGiaoDich) qb.andWhere('h.loai_giao_dich = :loai', { loai: query.loaiGiaoDich });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async adjustStock(dto: AdjustStockDto, nguoiThucHienId: number): Promise<{ success: true }> {
    await this.dataSource.transaction(async (manager) => {
      const { before, after } = await this.upsertStockLevel(manager, dto.phienBanId, dto.soLuong);

      if (dto.soLuong < 0) {
        // Deduct via FIFO across existing batches — mirrors order fulfillment logic
        const deductions = await this.batchService.deductFromBatches(
          manager,
          dto.phienBanId,
          Math.abs(dto.soLuong),
        );
        for (const d of deductions) {
          await this.writeHistory(manager, {
            phienBanId: dto.phienBanId,
            loaiGiaoDich: dto.loaiGiaoDich as LoaiGiaoDich,
            soLuong: -d.soLuong,
            soLuongTruoc: before,
            soLuongSau: after,
            loId: d.loId,
            giaVon: d.donGiaNhap,
            nguoiThucHienId,
            ghiChu: dto.ghiChu ?? null,
          });
        }
      } else {
        // Create adjustment batch at current weighted avg cost — keeps batches in sync
        const sl = await manager.findOne(StockLevel, { where: { phienBanId: dto.phienBanId } });
        const avgCost = Number(sl?.giaVonTrungBinh ?? 0);
        const batch = await this.batchService.createAdjustmentBatch(manager, {
          phienBanId: dto.phienBanId,
          soLuongNhap: dto.soLuong,
          donGiaNhap: avgCost,
          nguoiTaoId: nguoiThucHienId,
          ghiChu: dto.ghiChu ?? undefined,
        });
        await this.writeHistory(manager, {
          phienBanId: dto.phienBanId,
          loaiGiaoDich: dto.loaiGiaoDich as LoaiGiaoDich,
          soLuong: dto.soLuong,
          soLuongTruoc: before,
          soLuongSau: after,
          loId: batch.id,
          giaVon: avgCost,
          nguoiThucHienId,
          ghiChu: dto.ghiChu ?? null,
        });
      }

      await this.batchService.recalcWeightedAvgCost(manager, dto.phienBanId);
    });
    return { success: true };
  }

  async recordMovement(
    manager: EntityManager,
    params: {
      phienBanId: number;
      soLuong: number;
      loaiGiaoDich: LoaiGiaoDich;
      donHangId?: number;
      phieuNhapId?: number;
      phieuXuatId?: number;
      loId?: number;
      giaVon?: number;
      nguoiThucHienId: number | null;
      ghiChu?: string;
      soLuongTruoc?: number;
      soLuongSau?: number;
    },
  ): Promise<void> {
    await this.writeHistory(manager, {
      phienBanId: params.phienBanId,
      loaiGiaoDich: params.loaiGiaoDich,
      soLuong: params.soLuong,
      soLuongTruoc: params.soLuongTruoc ?? null,
      soLuongSau: params.soLuongSau ?? null,
      donHangId: params.donHangId ?? null,
      phieuNhapId: params.phieuNhapId ?? null,
      phieuXuatId: params.phieuXuatId ?? null,
      loId: params.loId ?? null,
      giaVon: params.giaVon ?? null,
      nguoiThucHienId: params.nguoiThucHienId,
      ghiChu: params.ghiChu ?? null,
    });
  }

  async upsertStockLevel(
    manager: EntityManager,
    phienBanId: number,
    delta: number,
  ): Promise<{ before: number; after: number }> {
    const existing = await manager.findOne(StockLevel, { where: { phienBanId } });
    if (existing) {
      const before = existing.soLuongTon;
      const after = before + delta;
      if (after < 0) throw new BadRequestException('Tồn kho không đủ để thực hiện thao tác');
      existing.soLuongTon = after;
      await manager.save(StockLevel, existing);
      return { before, after };
    } else {
      if (delta < 0) throw new BadRequestException('Tồn kho không đủ để thực hiện thao tác');
      await manager.save(StockLevel, manager.create(StockLevel, { phienBanId, soLuongTon: delta }));
      return { before: 0, after: delta };
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
