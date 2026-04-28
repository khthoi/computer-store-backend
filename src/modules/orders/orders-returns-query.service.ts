import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersReturnsQueryService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    private dataSource: DataSource,
  ) {}

  async getReturnRequestsForOrder(orderCode: string) {
    const order = await this.orderRepo.findOne({ where: { maDonHang: orderCode } });
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');

    const requests: Array<{
      yeu_cau_id: number; loai_yeu_cau: string; ly_do: string; mo_ta_chi_tiet: string | null;
      trang_thai: string; huong_xu_ly: string | null; ngay_tao: Date; ngay_cap_nhat: Date;
      nhan_vien_xu_ly_ten: string | null;
    }> = await this.dataSource.query(
      `SELECT yr.yeu_cau_id, yr.loai_yeu_cau, yr.ly_do, yr.mo_ta_chi_tiet,
              yr.trang_thai, yr.huong_xu_ly, yr.ngay_tao, yr.ngay_cap_nhat,
              nv.ho_ten AS nhan_vien_xu_ly_ten
       FROM yeu_cau_doi_tra yr
       LEFT JOIN nhan_vien nv ON nv.nhan_vien_id = yr.nhan_vien_xu_ly_id
       WHERE yr.don_hang_id = ? ORDER BY yr.ngay_tao DESC`,
      [order.id],
    );
    if (!requests.length) return [];

    const requestIds = requests.map((r) => r.yeu_cau_id);

    const items: Array<{
      yeu_cau_id: number; phien_ban_id: number; so_luong: number;
      ten_phien_ban: string | null; ten_san_pham: string | null; thumbnail_url: string | null;
    }> = await this.dataSource.query(
      `SELECT ct.yeu_cau_id, ct.phien_ban_id, ct.so_luong,
              pbsp.ten_phien_ban, sp.ten_san_pham,
              (SELECT url_hinh_anh FROM hinh_anh_san_pham
               WHERE phien_ban_id = ct.phien_ban_id ORDER BY thu_tu ASC LIMIT 1) AS thumbnail_url
       FROM yeu_cau_doi_tra_chi_tiet ct
       LEFT JOIN phien_ban_san_pham pbsp ON pbsp.phien_ban_id = ct.phien_ban_id
       LEFT JOIN san_pham sp ON sp.san_pham_id = pbsp.san_pham_id
       WHERE ct.yeu_cau_id IN (?)`,
      [requestIds],
    );

    const refundedData: Array<{ yeu_cau_doi_tra_id: number; phien_ban_id: number; refunded_qty: string }> =
      await this.dataSource.query(
        `SELECT h.yeu_cau_doi_tra_id, rci.phien_ban_id,
                COALESCE(SUM(rci.so_luong), 0) AS refunded_qty
         FROM hoan_tien_don_hang_chi_tiet rci
         INNER JOIN hoan_tien_don_hang h ON h.hoan_tien_id = rci.hoan_tien_id
         WHERE h.yeu_cau_doi_tra_id IN (?) AND h.trang_thai <> 'TuChoi'
         GROUP BY h.yeu_cau_doi_tra_id, rci.phien_ban_id`,
        [requestIds],
      );

    const itemsMap = new Map<number, typeof items>();
    for (const item of items) {
      const list = itemsMap.get(item.yeu_cau_id) ?? [];
      list.push(item);
      itemsMap.set(item.yeu_cau_id, list);
    }
    const refKey = (yc: number, v: number) => `${yc}-${v}`;
    const refundedMap = new Map<string, number>();
    for (const r of refundedData) {
      refundedMap.set(refKey(r.yeu_cau_doi_tra_id, r.phien_ban_id), Number(r.refunded_qty));
    }

    return requests.map((req) => ({
      id:              req.yeu_cau_id,
      requestType:     req.loai_yeu_cau,
      reason:          req.ly_do,
      description:     req.mo_ta_chi_tiet ?? undefined,
      status:          req.trang_thai,
      resolution:      req.huong_xu_ly ?? undefined,
      createdAt:       (req.ngay_tao instanceof Date ? req.ngay_tao : new Date(req.ngay_tao)).toISOString(),
      updatedAt:       (req.ngay_cap_nhat instanceof Date ? req.ngay_cap_nhat : new Date(req.ngay_cap_nhat)).toISOString(),
      processedByName: req.nhan_vien_xu_ly_ten ?? undefined,
      items: (itemsMap.get(req.yeu_cau_id) ?? []).map((item) => ({
        variantId:    String(item.phien_ban_id),
        variantName:  item.ten_phien_ban ?? '',
        productName:  item.ten_san_pham ?? '',
        thumbnailUrl: item.thumbnail_url ?? undefined,
        requestedQty: item.so_luong,
        refundedQty:  refundedMap.get(refKey(req.yeu_cau_id, item.phien_ban_id)) ?? 0,
      })),
    }));
  }
}
