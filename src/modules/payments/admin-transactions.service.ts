import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { Order } from '../orders/entities/order.entity';
import { GetTransactionsQueryDto } from './dto/get-transactions-query.dto';
import {
  TransactionRowResponseDto,
  GetTransactionsResponseDto,
  toTransactionRowDto,
} from './dto/transaction-row-response.dto';
import { TransactionStatsResponseDto } from './dto/transaction-stats-response.dto';

@Injectable()
export class AdminTransactionsService {
  constructor(
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
  ) {}

  async getTransactionsList(query: GetTransactionsQueryDto): Promise<GetTransactionsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.txRepo
      .createQueryBuilder('t')
      .innerJoin('don_hang', 'o', 'o.don_hang_id = t.don_hang_id')
      .innerJoin('khach_hang', 'kh', 'kh.khach_hang_id = o.khach_hang_id')
      .select([
        't.giao_dich_id   AS t_id',
        't.don_hang_id    AS t_donHangId',
        't.phuong_thuc_thanh_toan AS t_phuongThucThanhToan',
        't.so_tien        AS t_soTien',
        't.trang_thai_giao_dich AS t_trangThaiGiaoDich',
        't.ma_giao_dich_ngoai AS t_maGiaoDichNgoai',
        't.ngan_hang_vi   AS t_nganHangVi',
        't.thoi_diem_thanh_toan AS t_thoiDiemThanhToan',
        't.ghi_chu_loi    AS t_ghiChuLoi',
        't.ngay_tao       AS t_ngayTao',
        'o.ma_don_hang    AS o_maDonHang',
        'o.khach_hang_id  AS o_khachHangId',
        'kh.ho_ten        AS kh_hoTen',
        'kh.email         AS kh_email',
      ]);

    if (query.trangThai?.length) {
      qb.andWhere('t.trang_thai_giao_dich IN (:...trangThai)', { trangThai: query.trangThai });
    }
    if (query.phuongThuc?.length) {
      qb.andWhere('t.phuong_thuc_thanh_toan IN (:...phuongThuc)', { phuongThuc: query.phuongThuc });
    }
    if (query.tuNgay) {
      qb.andWhere('t.ngay_tao >= :tuNgay', { tuNgay: query.tuNgay });
    }
    if (query.denNgay) {
      // denNgay inclusive: add 1 day
      const nextDay = new Date(query.denNgay);
      nextDay.setDate(nextDay.getDate() + 1);
      qb.andWhere('t.ngay_tao < :denNgayExcl', { denNgayExcl: nextDay.toISOString().slice(0, 10) });
    }
    if (query.q) {
      qb.andWhere(
        '(o.ma_don_hang LIKE :q OR t.ma_giao_dich_ngoai LIKE :q OR kh.ho_ten LIKE :q)',
        { q: `%${query.q}%` },
      );
    }

    const allowedSortBy: Record<string, string> = {
      ngayTao:           't.ngay_tao',
      soTien:            't.so_tien',
      tenKhachHang:      'kh.ho_ten',
      thoiDiemThanhToan: 't.thoi_diem_thanh_toan',
    };
    const orderCol = allowedSortBy[query.sortBy ?? ''] ?? 't.ngay_tao';
    const orderDir = (query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';
    qb.orderBy(orderCol, orderDir);

    // Clone để đếm trước khi apply pagination
    const countQb = qb.clone();
    const total = await countQb.getCount();

    const raws = await qb.offset((page - 1) * limit).limit(limit).getRawMany();
    const data: TransactionRowResponseDto[] = raws.map(toTransactionRowDto);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getTransactionStats(): Promise<TransactionStatsResponseDto> {
    const raw = await this.txRepo
      .createQueryBuilder('t')
      .select([
        'COUNT(*) AS tongGiaoDich',
        "COALESCE(SUM(CASE WHEN t.trang_thai_giao_dich = 'ThanhCong' THEN t.so_tien ELSE 0 END), 0) AS tongTien",
        "SUM(CASE WHEN t.trang_thai_giao_dich = 'ThanhCong' THEN 1 ELSE 0 END) AS soThanhCong",
        "SUM(CASE WHEN t.trang_thai_giao_dich = 'ThatBai'   THEN 1 ELSE 0 END) AS soThatBai",
        "SUM(CASE WHEN t.trang_thai_giao_dich = 'Cho'       THEN 1 ELSE 0 END) AS soDangCho",
        "SUM(CASE WHEN t.trang_thai_giao_dich = 'DaHoan'    THEN 1 ELSE 0 END) AS soDaHoan",
      ])
      .getRawOne<Record<string, string>>();

    const tongGiaoDich = Number(raw?.tongGiaoDich ?? 0);
    const soThanhCong  = Number(raw?.soThanhCong  ?? 0);
    const tyLeThanhCong =
      tongGiaoDich > 0
        ? Math.round((soThanhCong / tongGiaoDich) * 1000) / 10
        : 0;

    return {
      tongGiaoDich,
      tongTien:     parseFloat(raw?.tongTien ?? '0'),
      soThanhCong,
      soThatBai:    Number(raw?.soThatBai  ?? 0),
      soDangCho:    Number(raw?.soDangCho  ?? 0),
      soDaHoan:     Number(raw?.soDaHoan   ?? 0),
      tyLeThanhCong,
    };
  }

  async getTransactionByOrderCode(orderCode: string): Promise<Transaction> {
    const order = await this.orderRepo.findOne({ where: { maDonHang: orderCode } });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    const tx = await this.txRepo.findOne({ where: { donHangId: order.id } });
    if (!tx) throw new NotFoundException('Giao dịch không tồn tại');

    return tx;
  }
}
