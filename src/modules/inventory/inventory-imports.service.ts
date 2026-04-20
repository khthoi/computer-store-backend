import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ImportReceipt } from './entities/import-receipt.entity';
import { ImportReceiptItem } from './entities/import-receipt-item.entity';
import { CreateImportReceiptDto } from './dto/create-import-receipt.dto';
import { ApproveImportDto } from './dto/approve-import.dto';
import { InventoryService } from './inventory.service';

@Injectable()
export class InventoryImportsService {
  constructor(
    @InjectRepository(ImportReceipt)
    private readonly receiptRepo: Repository<ImportReceipt>,
    @InjectRepository(ImportReceiptItem)
    private readonly itemRepo: Repository<ImportReceiptItem>,
    private readonly inventoryService: InventoryService,
    private readonly dataSource: DataSource,
  ) {}

  findAll() {
    return this.receiptRepo.find({ order: { ngayNhap: 'DESC' }, relations: ['items'] });
  }

  async findOne(id: number): Promise<ImportReceipt> {
    const receipt = await this.receiptRepo.findOne({ where: { id }, relations: ['items'] });
    if (!receipt) throw new NotFoundException('Phiếu nhập không tồn tại');
    return receipt;
  }

  async create(dto: CreateImportReceiptDto, nhanVienId: number): Promise<ImportReceipt> {
    const maPhieuNhap = this.generateCode();
    return this.dataSource.transaction(async (manager) => {
      const receipt = manager.create(ImportReceipt, {
        nhaCungCapId: dto.nhaCungCapId,
        khoId: dto.khoId,
        nhanVienNhapId: nhanVienId,
        maPhieuNhap,
        ghiChu: dto.ghiChu ?? null,
      });
      const saved = await manager.save(ImportReceipt, receipt);

      const items = dto.items.map((i) =>
        manager.create(ImportReceiptItem, {
          phieuNhapId: saved.id,
          phienBanId: i.phienBanId,
          soLuongDuKien: i.soLuongDuKien,
          donGiaNhap: i.donGiaNhap ?? null,
          ghiChu: i.ghiChu ?? null,
        }),
      );
      await manager.save(ImportReceiptItem, items);

      return manager.findOne(ImportReceipt, { where: { id: saved.id }, relations: ['items'] }) as Promise<ImportReceipt>;
    });
  }

  async approve(id: number, nhanVienId: number, dto?: ApproveImportDto): Promise<ImportReceipt> {
    const receipt = await this.findOne(id);
    if (receipt.trangThai !== 'ChoDuyet') {
      throw new BadRequestException('Phiếu nhập đã được xử lý');
    }

    const actualQtyMap = new Map(
      (dto?.items ?? []).map((i) => [i.phienBanId, i.soLuongThucNhap]),
    );

    return this.dataSource.transaction(async (manager) => {
      receipt.trangThai = 'DaDuyet';
      await manager.save(ImportReceipt, receipt);

      for (const item of receipt.items) {
        const overrideQty = actualQtyMap.get(item.phienBanId);
        if (overrideQty !== undefined) {
          item.soLuongThucNhap = overrideQty;
          await manager.save(ImportReceiptItem, item);
        }
        const actualQty = item.soLuongThucNhap ?? item.soLuongDuKien;
        await this.inventoryService.upsertStockLevel(manager, item.phienBanId, receipt.khoId, actualQty);
        await this.inventoryService.recordMovement(manager, {
          phienBanId: item.phienBanId,
          khoId: receipt.khoId,
          soLuong: actualQty,
          loaiGiaoDich: 'Nhap',
          phieuNhapId: receipt.id,
          nguoiThucHienId: nhanVienId,
          ghiChu: `Nhập kho theo phiếu ${receipt.maPhieuNhap}`,
        });
      }

      return manager.findOne(ImportReceipt, { where: { id: receipt.id }, relations: ['items'] }) as Promise<ImportReceipt>;
    });
  }

  async reject(id: number): Promise<ImportReceipt> {
    const receipt = await this.findOne(id);
    if (receipt.trangThai !== 'ChoDuyet') {
      throw new BadRequestException('Phiếu nhập đã được xử lý');
    }
    receipt.trangThai = 'TuChoi';
    return this.receiptRepo.save(receipt);
  }

  private generateCode(): string {
    const now = new Date();
    const yyyymm = now.toISOString().slice(0, 7).replace(/-/g, '');
    const rand = Math.floor(Math.random() * 9000) + 1000;
    return `PN-${yyyymm}-${rand}`;
  }
}
