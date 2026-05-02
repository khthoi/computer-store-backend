import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ImportReceipt } from './entities/import-receipt.entity';
import { ImportReceiptItem } from './entities/import-receipt-item.entity';
import { CreateImportReceiptDto } from './dto/create-import-receipt.dto';
import { ApproveImportDto } from './dto/approve-import.dto';
import { ImportReceiptSummaryDto, ImportReceiptDetailDto } from './dto/import-receipt-response.dto';
import { QueryImportReceiptDto } from './dto/query-import-receipt.dto';
import { InventoryService } from './inventory.service';
import { BatchService } from './batch.service';

@Injectable()
export class InventoryImportsService {
  constructor(
    @InjectRepository(ImportReceipt)
    private readonly receiptRepo: Repository<ImportReceipt>,
    @InjectRepository(ImportReceiptItem)
    private readonly itemRepo: Repository<ImportReceiptItem>,
    private readonly inventoryService: InventoryService,
    private readonly batchService: BatchService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Mappers ─────────────────────────────────────────────────────────────────

  private mapStatus(trangThai: string): string {
    const map: Record<string, string> = {
      ChoDuyet:    'pending',
      DaDuyet:     'received',
      TiepNhanMot: 'partial',
      TuChoi:      'cancelled',
    };
    return map[trangThai] ?? 'pending';
  }

  private mapToSummary(receipt: ImportReceipt): ImportReceiptSummaryDto {
    const items = receipt.items ?? [];
    const totalCost = items.reduce(
      (s, i) => s + Number(i.donGiaNhap ?? 0) * ((i.soLuongThucNhap ?? i.soLuongDuKien) - (i.soLuongHuHong ?? 0)),
      0,
    );
    return {
      id: String(receipt.id),
      receiptCode: receipt.maPhieuNhap,
      supplierId: String(receipt.nhaCungCapId ?? ''),
      supplierName: receipt.nhaCungCap?.tenNhaCungCap ?? '',
      status: this.mapStatus(receipt.trangThai),
      itemCount: items.length,
      totalCost,
      expectedDate: receipt.ngayDuKien ?? receipt.ngayNhap.toISOString(),
      receivedDate: receipt.ngayDuyet?.toISOString() ?? null,
      createdById: String(receipt.nhanVienNhapId),
      createdByCode: receipt.nhanVienNhap?.maNhanVien ?? '',
      createdBy: receipt.nhanVienNhap?.hoTen ?? '',
      createdAt: receipt.ngayNhap.toISOString(),
      predecessorId: receipt.phieuTienNhiemId != null ? String(receipt.phieuTienNhiemId) : undefined,
      predecessorCode: receipt.phieuTienNhiem?.maPhieuNhap ?? undefined,
      successorId: receipt.phieuKeTiepId != null ? String(receipt.phieuKeTiepId) : undefined,
      successorCode: receipt.phieuKeTiep?.maPhieuNhap ?? undefined,
    };
  }

  private mapToDetail(receipt: ImportReceipt): ImportReceiptDetailDto {
    const summary = this.mapToSummary(receipt);
    return {
      ...summary,
      note: receipt.ghiChu ?? undefined,
      updatedAt: receipt.ngayNhap.toISOString(),
      lineItems: (receipt.items ?? []).map((i) => ({
        id: String(i.id),
        productId: String(i.phienBan?.sanPhamId ?? ''),
        variantId: String(i.phienBanId),
        productName: i.phienBan?.product?.tenSanPham ?? '',
        variantName: i.phienBan?.tenPhienBan ?? '',
        sku: i.phienBan?.sku ?? '',
        quantityOrdered: i.soLuongDuKien,
        quantityReceived: i.soLuongThucNhap ?? 0,
        quantityDamaged: i.soLuongHuHong ?? 0,
        quantityShort: Math.max(0, i.soLuongDuKien - (i.soLuongThucNhap ?? i.soLuongDuKien)),
        costPrice: Number(i.donGiaNhap ?? 0),
        sellingPrice: Number(i.phienBan?.giaBan ?? 0) || undefined,
        note: i.ghiChu ?? undefined,
      })),
    };
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────────

  async findAll(query: QueryImportReceiptDto = {}): Promise<{ data: ImportReceiptSummaryDto[]; total: number; page: number; limit: number; totalPages: number }> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC', status, search } = query;

    const allowedSortBy: Record<string, string> = {
      // Backend-native keys
      ngayNhap:    'r.ngayNhap',
      maPhieuNhap: 'r.maPhieuNhap',
      trangThai:   'r.trangThai',
      ngayDuKien:  'r.ngayDuKien',
      // Frontend-facing aliases (ImportReceiptsTable column keys)
      createdAt:    'r.ngayNhap',
      expectedDate: 'r.ngayDuKien',
      receiptCode:  'r.maPhieuNhap',
      status:       'r.trangThai',
      supplierName: 'ncc.tenNhaCungCap',
    };

    const statusMap: Record<string, string> = {
      pending:   'ChoDuyet',
      received:  'DaDuyet',
      partial:   'TiepNhanMot',
      cancelled: 'TuChoi',
    };

    const qb = this.receiptRepo.createQueryBuilder('r')
      .leftJoinAndSelect('r.nhaCungCap', 'ncc')
      .leftJoinAndSelect('r.nhanVienNhap', 'nv')
      .leftJoinAndSelect('r.items', 'items')
      .leftJoinAndSelect('r.phieuTienNhiem', 'pred')
      .leftJoinAndSelect('r.phieuKeTiep', 'succ')
      .skip((page - 1) * limit)
      .take(limit);

    if (status && statusMap[status]) {
      qb.andWhere('r.trangThai = :trangThai', { trangThai: statusMap[status] });
    }
    if (search) {
      qb.andWhere(
        '(r.maPhieuNhap LIKE :search OR ncc.tenNhaCungCap LIKE :search OR nv.hoTen LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const dir = sortOrder.toUpperCase() as 'ASC' | 'DESC';
    if (sortBy === 'itemCount') {
      qb.addSelect(
        '(SELECT COUNT(*) FROM chi_tiet_phieu_nhap _ct WHERE _ct.phieu_nhap_id = r.phieu_nhap_id)',
        'item_count_calc',
      );
      qb.orderBy('item_count_calc', dir);
    } else if (sortBy === 'totalCost') {
      qb.addSelect(
        '(SELECT COALESCE(SUM(_ct.don_gia_nhap * COALESCE(_ct.so_luong_thuc_nhap, _ct.so_luong_du_kien)), 0) FROM chi_tiet_phieu_nhap _ct WHERE _ct.phieu_nhap_id = r.phieu_nhap_id)',
        'total_cost_calc',
      );
      qb.orderBy('total_cost_calc', dir);
    } else {
      const orderCol = allowedSortBy[sortBy] ?? 'r.ngayNhap';
      qb.orderBy(orderCol, dir);
    }

    const [receipts, total] = await qb.getManyAndCount();
    return {
      data: receipts.map((r) => this.mapToSummary(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<ImportReceiptDetailDto> {
    const receipt = await this.receiptRepo.findOne({
      where: { id },
      relations: {
        items: { phienBan: { product: true } },
        nhaCungCap: true,
        nhanVienNhap: true,
        phieuTienNhiem: true,
        phieuKeTiep: true,
      },
    });
    if (!receipt) throw new NotFoundException('Phiếu nhập không tồn tại');
    return this.mapToDetail(receipt);
  }

  async create(dto: CreateImportReceiptDto, nhanVienId: number): Promise<ImportReceiptDetailDto> {
    const maPhieuNhap = this.generateCode();
    return this.dataSource.transaction(async (manager) => {
      const receipt = manager.create(ImportReceipt, {
        nhaCungCapId: dto.nhaCungCapId,
        nhanVienNhapId: nhanVienId,
        maPhieuNhap,
        ngayDuKien: dto.ngayDuKien ?? null,
        ghiChu: dto.ghiChu ?? null,
      });
      const savedReceipt = await manager.save(ImportReceipt, receipt);

      const items = dto.items.map((i) =>
        manager.create(ImportReceiptItem, {
          phieuNhapId: savedReceipt.id,
          phienBanId: i.phienBanId,
          soLuongDuKien: i.soLuongDuKien,
          donGiaNhap: i.donGiaNhap ?? null,
          ghiChu: i.ghiChu ?? null,
        }),
      );
      await manager.save(ImportReceiptItem, items);

      const saved = await manager.findOne(ImportReceipt, {
        where: { id: savedReceipt.id },
        relations: { items: { phienBan: { product: true } }, nhaCungCap: true, nhanVienNhap: true },
      });
      return this.mapToDetail(saved!);
    });
  }

  async approve(id: number, nhanVienId: number, dto?: ApproveImportDto): Promise<ImportReceiptDetailDto> {
    const receipt = await this.receiptRepo.findOne({
      where: { id },
      relations: { items: true },
    });
    if (!receipt) throw new NotFoundException('Phiếu nhập không tồn tại');
    if (receipt.trangThai !== 'ChoDuyet') {
      throw new BadRequestException('Phiếu nhập đã được xử lý');
    }

    const actualQtyMap = new Map(
      (dto?.items ?? []).map((i) => [
        i.phienBanId,
        { qty: i.soLuongThucNhap, damaged: i.soLuongHuHong ?? 0, ghiChu: i.ghiChu },
      ]),
    );

    return this.dataSource.transaction(async (manager) => {
      for (const item of receipt.items) {
        const override = actualQtyMap.get(item.phienBanId);
        if (override !== undefined) {
          item.soLuongThucNhap = override.qty;
          item.soLuongHuHong = override.damaged;
          if (override.ghiChu !== undefined) item.ghiChu = override.ghiChu;
          await manager.save(ImportReceiptItem, item);
        }

        const actualQty = item.soLuongThucNhap ?? item.soLuongDuKien;
        const damagedQty = item.soLuongHuHong ?? 0;

        if (damagedQty > actualQty) {
          throw new BadRequestException(
            `Số lượng hư hỏng (${damagedQty}) không thể lớn hơn số lượng thực nhận (${actualQty})`,
          );
        }

        const goodQty = actualQty - damagedQty;
        const unitCost = Number(item.donGiaNhap ?? 0);

        if (goodQty > 0) {
          const { before: qtyBefore, after: qtyAfter } = await this.inventoryService.upsertStockLevel(manager, item.phienBanId, goodQty);
          const goodBatch = await this.batchService.createBatch(manager, {
            chiTietPhieuId: item.id,
            phienBanId: item.phienBanId,
            donGiaNhap: unitCost,
            soLuongNhap: goodQty,
            ghiChu: item.ghiChu ?? undefined,
          });
          await this.batchService.recalcWeightedAvgCost(manager, item.phienBanId);

          const shortQty = Math.max(0, item.soLuongDuKien - actualQty);
          let movementNote = `Nhập kho theo phiếu ${receipt.maPhieuNhap}`;
          if (damagedQty > 0 || shortQty > 0) {
            const extras: string[] = [];
            if (damagedQty > 0) extras.push(`Hàng hỏng: ${damagedQty}`);
            if (shortQty > 0) extras.push(`Hàng thiếu: ${shortQty}`);
            movementNote += ` [${extras.join(', ')}]`;
          }

          await this.inventoryService.recordMovement(manager, {
            phienBanId: item.phienBanId,
            soLuong: goodQty,
            loaiGiaoDich: 'Nhap',
            phieuNhapId: receipt.id,
            loId: goodBatch.id,
            giaVon: unitCost,
            nguoiThucHienId: nhanVienId,
            ghiChu: movementNote,
            soLuongTruoc: qtyBefore,
            soLuongSau: qtyAfter,
          });
        }
      }

      const allFulfilled = receipt.items.every((item) => {
        const override = actualQtyMap.get(item.phienBanId);
        const actualQty = override !== undefined ? override.qty : (item.soLuongThucNhap ?? item.soLuongDuKien);
        const damagedQty = override !== undefined ? (override.damaged ?? 0) : (item.soLuongHuHong ?? 0);
        return (actualQty - damagedQty) >= item.soLuongDuKien;
      });
      receipt.trangThai = allFulfilled ? 'DaDuyet' : 'TiepNhanMot';
      receipt.ngayDuyet = new Date();
      await manager.save(ImportReceipt, receipt);

      // Tự động đóng phiếu gốc khi phiếu bổ sung được duyệt
      if (receipt.phieuTienNhiemId) {
        await manager.update(ImportReceipt, receipt.phieuTienNhiemId, { trangThai: 'DaDuyet' });
      }

      const final = await manager.findOne(ImportReceipt, {
        where: { id: receipt.id },
        relations: { items: { phienBan: { product: true } }, nhaCungCap: true, nhanVienNhap: true, phieuTienNhiem: true, phieuKeTiep: true },
      });
      return this.mapToDetail(final!);
    });
  }

  async complete(id: number): Promise<ImportReceiptDetailDto> {
    const receipt = await this.receiptRepo.findOne({
      where: { id },
      relations: { items: { phienBan: { product: true } }, nhaCungCap: true, nhanVienNhap: true, phieuTienNhiem: true, phieuKeTiep: true },
    });
    if (!receipt) throw new NotFoundException('Phiếu nhập không tồn tại');
    if (receipt.trangThai !== 'TiepNhanMot') {
      throw new BadRequestException('Chỉ có thể hoàn tất phiếu đang ở trạng thái tiếp nhận một phần');
    }
    if (receipt.phieuKeTiepId != null) {
      throw new BadRequestException('Phiếu đã có phiếu bổ sung đang xử lý, không thể hoàn tất thủ công');
    }
    receipt.trangThai = 'DaDuyet';
    await this.receiptRepo.save(receipt);
    return this.mapToDetail(receipt);
  }

  async reject(id: number): Promise<ImportReceiptDetailDto> {
    const receipt = await this.receiptRepo.findOne({
      where: { id },
      relations: { items: { phienBan: { product: true } }, nhaCungCap: true, nhanVienNhap: true, phieuTienNhiem: true, phieuKeTiep: true },
    });
    if (!receipt) throw new NotFoundException('Phiếu nhập không tồn tại');
    if (receipt.trangThai !== 'ChoDuyet') {
      throw new BadRequestException('Phiếu nhập đã được xử lý');
    }
    receipt.trangThai = 'TuChoi';
    await this.receiptRepo.save(receipt);
    return this.mapToDetail(receipt);
  }

  async resolve(id: number, nhanVienId: number): Promise<ImportReceiptDetailDto> {
    const receipt = await this.receiptRepo.findOne({
      where: { id },
      relations: { items: { phienBan: { product: true } }, nhaCungCap: true, nhanVienNhap: true, phieuTienNhiem: true, phieuKeTiep: true },
    });
    if (!receipt) throw new NotFoundException('Phiếu nhập không tồn tại');
    if (receipt.trangThai !== 'TiepNhanMot') {
      throw new BadRequestException('Chỉ có thể giải quyết phiếu đang ở trạng thái tiếp nhận một phần');
    }
    if (receipt.phieuKeTiepId != null) {
      throw new BadRequestException('Phiếu đã có phiếu bổ sung, không thể tạo thêm');
    }

    const shortItems = receipt.items
      .map((item) => {
        const goodQty = (item.soLuongThucNhap ?? item.soLuongDuKien) - (item.soLuongHuHong ?? 0);
        const soLuongConThieu = item.soLuongDuKien - goodQty;
        return { item, soLuongConThieu };
      })
      .filter(({ soLuongConThieu }) => soLuongConThieu > 0);

    if (shortItems.length === 0) {
      throw new BadRequestException('Không có dòng nào còn thiếu hàng');
    }

    const maPhieuMoi = this.generateCode();
    return this.dataSource.transaction(async (manager) => {
      const newReceipt = manager.create(ImportReceipt, {
        nhaCungCapId: receipt.nhaCungCapId,
        nhanVienNhapId: nhanVienId,
        maPhieuNhap: maPhieuMoi,
        ghiChu: `Phiếu bổ sung từ ${receipt.maPhieuNhap}`,
        ngayDuKien: receipt.ngayDuKien,
        phieuTienNhiemId: receipt.id,
      });
      const savedNew = await manager.save(ImportReceipt, newReceipt);

      const newItems = shortItems.map(({ item, soLuongConThieu }) =>
        manager.create(ImportReceiptItem, {
          phieuNhapId: savedNew.id,
          phienBanId: item.phienBanId,
          soLuongDuKien: soLuongConThieu,
          donGiaNhap: item.donGiaNhap,
          ghiChu: `Bổ sung từ ${receipt.maPhieuNhap}: thiếu ${soLuongConThieu}, hỏng ${item.soLuongHuHong ?? 0}`,
        }),
      );
      await manager.save(ImportReceiptItem, newItems);

      await manager.update(ImportReceipt, receipt.id, { phieuKeTiepId: savedNew.id });

      const final = await manager.findOne(ImportReceipt, {
        where: { id: savedNew.id },
        relations: { items: { phienBan: { product: true } }, nhaCungCap: true, nhanVienNhap: true, phieuTienNhiem: true, phieuKeTiep: true },
      });
      return this.mapToDetail(final!);
    });
  }

  async generateNextReceiptCode(): Promise<string> {
    return this.generateCode();
  }

  private generateCode(): string {
    const now = new Date();
    // Use Vietnam time (UTC+7) so month boundary matches local date
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const yyyymm = vnTime.toISOString().slice(0, 7).replace(/-/g, '');
    const rand = String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0');
    return `PN-${yyyymm}-${rand}`;
  }
}
