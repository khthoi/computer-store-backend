import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ExportReceipt, LoaiPhieuXuat } from './entities/export-receipt.entity';
import { ExportReceiptItem } from './entities/export-receipt-item.entity';
import { StockLevel } from './entities/stock-level.entity';
import { StockHistory, LoaiGiaoDich } from './entities/stock-history.entity';
import { CreateExportReceiptDto } from './dto/create-export-receipt.dto';
import { QueryExportReceiptDto } from './dto/query-export-receipt.dto';
import { ExportReceiptDetailDto, ExportReceiptSummaryDto } from './dto/export-receipt-response.dto';
import { InventoryService } from './inventory.service';
import { BatchService } from './batch.service';

@Injectable()
export class InventoryExportsService {
  constructor(
    @InjectRepository(ExportReceipt)
    private readonly exportRepo: Repository<ExportReceipt>,
    @InjectRepository(ExportReceiptItem)
    private readonly itemRepo: Repository<ExportReceiptItem>,
    private readonly inventoryService: InventoryService,
    private readonly batchService: BatchService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateExportReceiptDto, nhanVienId: number): Promise<ExportReceiptDetailDto> {
    const receiptId = await this.dataSource.transaction(async (manager) => {
      // 1. Validate stock đủ cho TẤT CẢ items trước khi thực hiện bất kỳ deduction nào
      for (const item of dto.items) {
        const sl = await manager.findOne(StockLevel, { where: { phienBanId: item.phienBanId } });
        const available = sl?.soLuongTon ?? 0;
        if (available < item.soLuong) {
          throw new BadRequestException(
            `Phiên bản ID ${item.phienBanId}: tồn kho ${available} units, yêu cầu xuất ${item.soLuong} units`,
          );
        }
      }

      // 2. Tạo phiếu xuất
      const maPhieuXuat = this.generateCode();
      const receipt = await manager.save(
        ExportReceipt,
        manager.create(ExportReceipt, {
          maPhieuXuat,
          loaiPhieu: dto.loaiPhieu as LoaiPhieuXuat,
          nhanVienXuatId: nhanVienId,
          lyDo: dto.lyDo,
          ghiChu: dto.ghiChu ?? null,
          tongGiaVon: 0,
        }),
      );

      let tongGiaVonPhieu = 0;

      // 3. Xử lý từng dòng
      for (const item of dto.items) {
        const { before, after } = await this.inventoryService.upsertStockLevel(
          manager,
          item.phienBanId,
          -item.soLuong,
        );

        // FIFO deduction — trả về [{loId, soLuong, donGiaNhap}, ...]
        const deductions = await this.batchService.deductFromBatches(
          manager,
          item.phienBanId,
          item.soLuong,
        );

        // Giá vốn FIFO thực tế = tổng (soLuong × donGiaNhap) của từng lô bị trừ
        const tongGiaVonItem = deductions.reduce(
          (s, d) => s + d.soLuong * Number(d.donGiaNhap),
          0,
        );
        // Giá vốn bình quân trên dòng = tongGiaVon / soLuong (dùng để hiển thị)
        const giaVonTb = item.soLuong > 0 ? tongGiaVonItem / item.soLuong : 0;
        tongGiaVonPhieu += tongGiaVonItem;

        await manager.save(
          ExportReceiptItem,
          manager.create(ExportReceiptItem, {
            phieuXuatId: receipt.id,
            phienBanId: item.phienBanId,
            soLuong: item.soLuong,
            giaVonTb,
            tongGiaVon: tongGiaVonItem,
            ghiChu: item.ghiChu ?? null,
          }),
        );

        const loaiGiaoDich: LoaiGiaoDich = dto.loaiPhieu === 'XuatHuy' ? 'Huy' : 'Xuat';

        // Ghi history — 1 dòng mỗi lô bị trừ
        for (const d of deductions) {
          await this.inventoryService.recordMovement(manager, {
            phienBanId: item.phienBanId,
            soLuong: -d.soLuong,
            loaiGiaoDich,
            phieuXuatId: receipt.id,
            loId: d.loId,
            giaVon: d.donGiaNhap,
            nguoiThucHienId: nhanVienId,
            ghiChu: `Xuất kho ${maPhieuXuat}: ${dto.lyDo}`,
            soLuongTruoc: before,
            soLuongSau: after,
          });
        }

        await this.batchService.recalcWeightedAvgCost(manager, item.phienBanId);
      }

      // 4. Cập nhật tổng giá vốn phiếu
      await manager.update(ExportReceipt, receipt.id, { tongGiaVon: tongGiaVonPhieu });

      return receipt.id;
    });

    // Gọi findOne SAU KHI transaction commit — this.exportRepo dùng connection riêng
    // không thấy data trong transaction chưa commit
    return this.findOne(receiptId);
  }

  async findAll(query: QueryExportReceiptDto = {}): Promise<{
    data: ExportReceiptSummaryDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      loaiPhieu,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const allowedSortBy: Record<string, string> = {
      createdAt: 'r.ngayXuat',
      receiptCode: 'r.maPhieuXuat',
      loaiPhieu: 'r.loaiPhieu',
      tongGiaVon: 'r.tongGiaVon',
      createdBy: 'nv.hoTen',
    };

    const qb = this.exportRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.nhanVienXuat', 'nv')
      .leftJoinAndSelect('r.items', 'items')
      .skip((page - 1) * limit)
      .take(limit);

    if (loaiPhieu) qb.andWhere('r.loaiPhieu = :loaiPhieu', { loaiPhieu });
    if (search) {
      qb.andWhere('(r.maPhieuXuat LIKE :s OR nv.hoTen LIKE :s OR nv.maNhanVien LIKE :s)', {
        s: `%${search}%`,
      });
    }
    if (startDate) qb.andWhere('r.ngayXuat >= :startDate', { startDate });
    if (endDate) qb.andWhere('r.ngayXuat <= :endDate', { endDate });

    const dir = (sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';
    qb.orderBy(allowedSortBy[sortBy] ?? 'r.ngayXuat', dir);

    const [receipts, total] = await qb.getManyAndCount();

    return {
      data: receipts.map((r) => this.mapToSummary(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<ExportReceiptDetailDto> {
    const receipt = await this.exportRepo.findOne({
      where: { id },
      relations: {
        nhanVienXuat: true,
        items: { phienBan: { product: true } },
      },
    });
    if (!receipt) throw new NotFoundException('Phiếu xuất không tồn tại');

    // Lấy chi tiết FIFO từ history — dùng property name (camelCase), không dùng column name
    const histories = await this.dataSource
      .getRepository(StockHistory)
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.lo', 'lo')
      .where('h.phieuXuatId = :id', { id })
      .getMany();

    return this.mapToDetail(receipt, histories);
  }

  // ─── Mappers ──────────────────────────────────────────────────────────────────

  private readonly loaiLabel: Record<string, string> = {
    XuatHuy: 'Huỷ hàng hỏng',
    XuatDieuChinh: 'Điều chỉnh',
    XuatNoiBo: 'Xuất nội bộ',
    XuatBan: 'Xuất bán',
  };

  private mapToSummary(r: ExportReceipt): ExportReceiptSummaryDto {
    const items = r.items ?? [];
    return {
      id: String(r.id),
      receiptCode: r.maPhieuXuat,
      loaiPhieu: r.loaiPhieu,
      loaiPhieuLabel: this.loaiLabel[r.loaiPhieu] ?? r.loaiPhieu,
      createdById: String(r.nhanVienXuatId),
      createdByCode: r.nhanVienXuat?.maNhanVien ?? '',
      createdBy: r.nhanVienXuat?.hoTen ?? '',
      lyDo: r.lyDo,
      itemCount: items.length,
      totalQty: items.reduce((s, i) => s + i.soLuong, 0),
      tongGiaVon: Number(r.tongGiaVon),
      createdAt: r.ngayXuat.toISOString(),
    };
  }

  private mapToDetail(r: ExportReceipt, histories: StockHistory[]): ExportReceiptDetailDto {
    const summary = this.mapToSummary(r);
    return {
      ...summary,
      ghiChu: r.ghiChu ?? undefined,
      lineItems: (r.items ?? []).map((item) => {
        const itemHistories = histories.filter((h) => h.phienBanId === item.phienBanId);
        return {
          id: String(item.id),
          variantId: String(item.phienBanId),
          productId: item.phienBan?.sanPhamId != null ? String(item.phienBan.sanPhamId) : '',
          productName: item.phienBan?.product?.tenSanPham ?? '',
          variantName: item.phienBan?.tenPhienBan ?? '',
          sku: item.phienBan?.sku ?? '',
          quantityExported: item.soLuong,
          costPrice: Number(item.giaVonTb),
          totalCost: Number(item.tongGiaVon),
          batchesDeducted: itemHistories.map((h) => ({
            loId: String(h.loId ?? ''),
            maLo: h.lo?.maLo ?? '',
            soLuong: Math.abs(h.soLuong),
            giaVon: Number(h.giaVon ?? 0),
          })),
          note: item.ghiChu ?? undefined,
        };
      }),
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private generateCode(): string {
    const now = new Date();
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const yyyymm = vnTime.toISOString().slice(0, 7).replace(/-/g, '');
    const rand = String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0');
    return `PX-${yyyymm}-${rand}`;
  }
}
