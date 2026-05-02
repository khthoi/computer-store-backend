import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { StockBatch } from './entities/stock-batch.entity';
import { StockLevel } from './entities/stock-level.entity';
import { InventorySettings } from './entities/inventory-settings.entity';
import { StockBatchResponseDto } from './dto/inventory-item-response.dto';

export type DeductionResult = { loId: number; soLuong: number; donGiaNhap: number }[];

@Injectable()
export class BatchService {
  constructor(
    @InjectRepository(StockBatch)
    private readonly batchRepo: Repository<StockBatch>,
    @InjectRepository(StockLevel)
    private readonly stockRepo: Repository<StockLevel>,
    @InjectRepository(InventorySettings)
    private readonly settingsRepo: Repository<InventorySettings>,
  ) {}

  async createBatch(
    manager: EntityManager,
    data: {
      chiTietPhieuId: number;
      phienBanId: number;
      donGiaNhap: number;
      soLuongNhap: number;
      trangThai?: 'con_hang';
      ghiChu?: string;
    },
  ): Promise<StockBatch> {
    const maLo = this.generateBatchCode('LOT');
    const status = data.trangThai ?? 'con_hang';
    return manager.save(
      StockBatch,
      manager.create(StockBatch, {
        maLo,
        chiTietPhieuId: data.chiTietPhieuId,
        phienBanId: data.phienBanId,
        donGiaNhap: data.donGiaNhap,
        soLuongNhap: data.soLuongNhap,
        soLuongConLai: data.soLuongNhap,
        trangThai: status,
        ghiChu: data.ghiChu ?? null,
      }),
    );
  }

  async createAdjustmentBatch(
    manager: EntityManager,
    data: {
      phienBanId: number;
      soLuongNhap: number;
      donGiaNhap: number;
      nguoiTaoId: number;
      ghiChu?: string;
    },
  ): Promise<StockBatch> {
    const maLo = this.generateBatchCode('ADJ');
    return manager.save(
      StockBatch,
      manager.create(StockBatch, {
        maLo,
        chiTietPhieuId: null,
        phienBanId: data.phienBanId,
        donGiaNhap: data.donGiaNhap,
        soLuongNhap: data.soLuongNhap,
        soLuongConLai: data.soLuongNhap,
        trangThai: 'con_hang',
        nguoiTaoId: data.nguoiTaoId,
        ghiChu: data.ghiChu ?? null,
      }),
    );
  }

  async deductFromBatches(
    manager: EntityManager,
    phienBanId: number,
    soLuong: number,
    phuongPhap: 'FIFO' | 'LIFO' = 'FIFO',
  ): Promise<DeductionResult> {
    const order = phuongPhap === 'FIFO' ? 'ASC' : 'DESC';
    const batches = await manager.find(StockBatch, {
      where: { phienBanId, trangThai: 'con_hang' },
      order: { ngayNhap: order },
    });

    let remaining = soLuong;
    const result: DeductionResult = [];

    for (const batch of batches) {
      if (remaining <= 0) break;
      const take = Math.min(batch.soLuongConLai, remaining);
      batch.soLuongConLai -= take;
      if (batch.soLuongConLai === 0) batch.trangThai = 'da_het';
      await manager.save(StockBatch, batch);
      result.push({ loId: batch.id, soLuong: take, donGiaNhap: Number(batch.donGiaNhap) });
      remaining -= take;
    }

    return result;
  }

  async getBatchesByVariant(phienBanId: number): Promise<StockBatchResponseDto[]> {
    const batches = await this.batchRepo.find({
      where: { phienBanId },
      relations: {
        chiTietPhieu: { receipt: { nhanVienNhap: true } },
        phienBan: { product: true, images: true },
        nguoiTao: true,
      },
      order: { ngayNhap: 'ASC' },
    });
    const nextFifoId = batches.find((b) => b.soLuongConLai > 0)?.id;
    return batches.map((b) => {
      const mainImage = b.phienBan?.images?.find((img: any) => img.loaiAnh === 'AnhChinh') ?? b.phienBan?.images?.[0];
      // ADJ batches have no chiTietPhieu — use nguoiTao directly
      const createdBy = b.chiTietPhieu?.receipt?.nhanVienNhap?.hoTen ?? b.nguoiTao?.hoTen ?? undefined;
      const createdByCode = b.chiTietPhieu?.receipt?.nhanVienNhap?.maNhanVien ?? b.nguoiTao?.maNhanVien ?? undefined;
      return {
        id: String(b.id),
        maLo: b.maLo,
        variantId: String(b.phienBanId),
        importReceiptId: b.chiTietPhieu?.phieuNhapId != null ? String(b.chiTietPhieu.phieuNhapId) : undefined,
        receiptCode: b.chiTietPhieu?.receipt?.maPhieuNhap ?? undefined,
        quantityImported: b.soLuongNhap,
        quantityRemaining: b.soLuongConLai,
        costPrice: Number(b.donGiaNhap),
        importedAt: b.ngayNhap instanceof Date ? b.ngayNhap.toISOString() : String(b.ngayNhap),
        note: b.ghiChu ?? undefined,
        createdBy,
        createdByCode,
        productId: b.phienBan?.sanPhamId != null ? String(b.phienBan.sanPhamId) : undefined,
        productName: b.phienBan?.product?.tenSanPham ?? undefined,
        variantName: b.phienBan?.tenPhienBan ?? undefined,
        sku: b.phienBan?.sku ?? undefined,
        sellingPrice: b.phienBan?.giaBan != null ? Number(b.phienBan.giaBan) : undefined,
        thumbnailUrl: mainImage?.urlHinhAnh ?? undefined,
        trangThai: b.trangThai,
        isNextFifo: b.id === nextFifoId,
      };
    });
  }

  async calculateWeightedAvgCost(phienBanId: number): Promise<number> {
    const batches = await this.batchRepo.find({ where: { phienBanId, trangThai: 'con_hang' } });
    const totalQty = batches.reduce((s, b) => s + b.soLuongConLai, 0);
    if (totalQty === 0) return 0;
    const totalCost = batches.reduce((s, b) => s + b.soLuongConLai * Number(b.donGiaNhap), 0);
    return totalCost / totalQty;
  }

  async recalcWeightedAvgCost(manager: EntityManager, phienBanId: number): Promise<void> {
    const batches = await manager.find(StockBatch, { where: { phienBanId, trangThai: 'con_hang' } });
    const totalQty = batches.reduce((s, b) => s + b.soLuongConLai, 0);
    const avg = totalQty === 0 ? 0 : batches.reduce((s, b) => s + b.soLuongConLai * Number(b.donGiaNhap), 0) / totalQty;
    await manager.update(StockLevel, { phienBanId }, { giaVonTrungBinh: avg });
  }

  async getSettings(): Promise<InventorySettings> {
    const all = await this.settingsRepo.find({ take: 1 });
    if (all.length > 0) return all[0];
    return this.settingsRepo.save(this.settingsRepo.create({ phuongPhapXuatKho: 'FIFO' }));
  }

  private generateBatchCode(prefix: string): string {
    const now = new Date();
    const yyyymm = now.toISOString().slice(0, 7).replace(/-/g, '');
    const rand = String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0');
    return `${prefix}-${yyyymm}-${rand}`;
  }
}
