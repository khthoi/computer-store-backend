import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockHistory } from './entities/stock-history.entity';
import { QueryMovementsDto } from './dto/query-movements.dto';

const TYPE_TO_BACKEND: Record<string, string> = {
  stock_in:   'Nhap',
  stock_out:  'Xuat',
  return:     'HoanTra',
  adjustment: 'DieuChinh',
};

const TYPE_TO_FRONTEND: Record<string, string> = {
  Nhap:       'stock_in',
  Xuat:       'stock_out',
  HoanTra:    'return',
  Huy:        'stock_out',
  DieuChinh:  'adjustment',
};

const SORT_COLUMNS: Record<string, string> = {
  performedAt:    'h.thoi_diem',
  quantityChange: 'h.so_luong',
};

@Injectable()
export class InventoryHistoryService {
  constructor(
    @InjectRepository(StockHistory)
    private readonly historyRepo: Repository<StockHistory>,
  ) {}

  async findMovements(query: QueryMovementsDto) {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 25;
    const orderCol = SORT_COLUMNS[query.sortBy ?? 'performedAt'] ?? 'h.thoi_diem';
    const orderDir = (query.sortDir === 'asc' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';

    const baseQb = () =>
      this.historyRepo
        .createQueryBuilder('h')
        .leftJoin('phien_ban_san_pham', 'pb', 'pb.phien_ban_id = h.phien_ban_id')
        .leftJoin('san_pham', 'sp', 'sp.san_pham_id = pb.san_pham_id');

    const applyFilters = (qb: ReturnType<typeof baseQb>) => {
      if (query.types) {
        const mapped = query.types
          .split(',')
          .map((t) => TYPE_TO_BACKEND[t.trim()])
          .filter(Boolean);
        if (mapped.length) qb.andWhere('h.loai_giao_dich IN (:...types)', { types: mapped });
      }
      if (query.dateFrom) qb.andWhere('h.thoi_diem >= :dateFrom', { dateFrom: query.dateFrom });
      if (query.dateTo)   qb.andWhere('h.thoi_diem <= :dateTo',   { dateTo: query.dateTo });
      if (query.q) {
        qb.andWhere('(sp.ten_san_pham LIKE :q OR pb.sku LIKE :q)', { q: `%${query.q}%` });
      }
    };

    const countQb = baseQb();
    applyFilters(countQb);
    const total = await countQb.getCount();

    const dataQb = baseQb()
      .select('h.lich_su_nx_id',  'id')
      .addSelect('h.loai_giao_dich', 'loaiGiaoDich')
      .addSelect('h.so_luong',       'soLuong')
      .addSelect('h.so_luong_truoc', 'soLuongTruoc')
      .addSelect('h.so_luong_sau',   'soLuongSau')
      .addSelect('h.don_hang_id',    'donHangId')
      .addSelect('h.phieu_nhap_id',  'phieuNhapId')
      .addSelect('h.phieu_xuat_id',  'phieuXuatId')
      .addSelect('h.ghi_chu',        'ghiChu')
      .addSelect('h.thoi_diem',      'thoiDiem')
      .addSelect('pb.phien_ban_id',  'variantId')
      .addSelect('pb.san_pham_id',   'productId')
      .addSelect('pb.ten_phien_ban', 'variantName')
      .addSelect('pb.sku',           'sku')
      .addSelect('sp.ten_san_pham',  'productName')
      .addSelect(
        `(SELECT nv.ho_ten FROM nhan_vien nv WHERE nv.nhan_vien_id = h.nguoi_thuc_hien_id LIMIT 1)`,
        'performedBy',
      )
      .addSelect(
        `(SELECT nv.ma_nhan_vien FROM nhan_vien nv WHERE nv.nhan_vien_id = h.nguoi_thuc_hien_id LIMIT 1)`,
        'performedByCode',
      )
      .addSelect('h.nguoi_thuc_hien_id', 'performedById')
      .orderBy(orderCol, orderDir)
      .offset((page - 1) * limit)
      .limit(limit);

    applyFilters(dataQb);
    const rows = await dataQb.getRawMany();

    const data = rows.map((r) => ({
      id:              String(r.id),
      type:            TYPE_TO_FRONTEND[r.loaiGiaoDich] ?? r.loaiGiaoDich,
      productId:       String(r.productId  ?? ''),
      variantId:       String(r.variantId  ?? ''),
      productName:     r.productName  ?? '',
      variantName:     r.variantName  ?? '',
      sku:             r.sku          ?? '',
      quantityBefore:  r.soLuongTruoc != null ? Number(r.soLuongTruoc) : 0,
      quantityChange:  Number(r.soLuong),
      quantityAfter:   r.soLuongSau   != null ? Number(r.soLuongSau)  : 0,
      referenceId:     r.donHangId ? String(r.donHangId) : r.phieuNhapId ? String(r.phieuNhapId) : r.phieuXuatId ? String(r.phieuXuatId) : undefined,
      referenceType:   r.donHangId ? 'order'           : r.phieuNhapId ? 'stock_in'           : r.phieuXuatId ? 'stock_out'          : undefined,
      note:            r.ghiChu          ?? undefined,
      performedBy:     r.performedBy     ?? 'Hệ thống',
      performedByCode: r.performedByCode ?? undefined,
      performedById:   r.performedById   != null ? String(r.performedById) : undefined,
      performedAt:     new Date(r.thoiDiem).toISOString(),
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
