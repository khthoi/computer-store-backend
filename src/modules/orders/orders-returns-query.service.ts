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
      nhan_vien_xu_ly_id: number | null; nhan_vien_xu_ly_ten: string | null;
    }> = await this.dataSource.query(
      `SELECT yr.yeu_cau_id, yr.loai_yeu_cau, yr.ly_do, yr.mo_ta_chi_tiet,
              yr.trang_thai, yr.huong_xu_ly, yr.ngay_tao, yr.ngay_cap_nhat,
              yr.nhan_vien_xu_ly_id,
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

    // Query resolution records for these return requests
    const resolutions: Array<{ yeu_cau_doi_tra_id: number; huong_xu_ly: string; trang_thai: string }> =
      await this.dataSource.query(
        `SELECT yeu_cau_doi_tra_id, huong_xu_ly, trang_thai
         FROM doi_tra_xu_ly WHERE yeu_cau_doi_tra_id IN (?)`,
        [requestIds],
      );
    const resolutionMap = new Map(resolutions.map((r) => [r.yeu_cau_doi_tra_id, r]));

    const itemsMap = new Map<number, typeof items>();
    for (const item of items) {
      const list = itemsMap.get(item.yeu_cau_id) ?? [];
      list.push(item);
      itemsMap.set(item.yeu_cau_id, list);
    }

    return requests.map((req) => ({
      id:              req.yeu_cau_id,
      requestType:     req.loai_yeu_cau,
      reason:          req.ly_do,
      description:     req.mo_ta_chi_tiet ?? undefined,
      status:          req.trang_thai,
      resolution:      req.huong_xu_ly ?? undefined,
      resolutionStatus: resolutionMap.get(req.yeu_cau_id)?.trang_thai ?? undefined,
      createdAt:       (req.ngay_tao instanceof Date ? req.ngay_tao : new Date(req.ngay_tao)).toISOString(),
      updatedAt:       (req.ngay_cap_nhat instanceof Date ? req.ngay_cap_nhat : new Date(req.ngay_cap_nhat)).toISOString(),
      processedByName: req.nhan_vien_xu_ly_ten ?? undefined,
      processedById:   req.nhan_vien_xu_ly_id != null ? String(req.nhan_vien_xu_ly_id) : undefined,
      items: (itemsMap.get(req.yeu_cau_id) ?? []).map((item) => ({
        variantId:    String(item.phien_ban_id),
        variantName:  item.ten_phien_ban ?? '',
        productName:  item.ten_san_pham ?? '',
        thumbnailUrl: item.thumbnail_url ?? undefined,
        requestedQty: item.so_luong,
        refundedQty:  0,
      })),
    }));
  }
}
