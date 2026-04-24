import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('report_daily_revenue')
export class DailyRevenueReport {
  @PrimaryColumn({ name: 'ngay', type: 'date' })
  date: string;

  @Column({ name: 'gmv', type: 'bigint', default: 0 })
  gmv: number;

  @Column({ name: 'doanh_thu_thuan', type: 'bigint', default: 0 })
  netRevenue: number;

  @Column({ name: 'tong_giam_gia', type: 'bigint', default: 0 })
  totalDiscount: number;

  @Column({ name: 'phi_van_chuyen', type: 'bigint', default: 0 })
  shippingFee: number;

  @Column({ name: 'so_don_dat', type: 'int', default: 0 })
  ordersPlaced: number;

  @Column({ name: 'so_don_hoan_thanh', type: 'int', default: 0 })
  ordersCompleted: number;

  @Column({ name: 'so_don_huy', type: 'int', default: 0 })
  ordersCancelled: number;

  @Column({ name: 'so_don_hoan_tra', type: 'int', default: 0 })
  ordersReturned: number;

  @Column({ name: 'gia_tri_don_tb', type: 'int', default: 0 })
  avgOrderValue: number;

  @Column({ name: 'so_khach_moi', type: 'int', default: 0 })
  newCustomers: number;

  @Column({ name: 'so_khach_mua_lai', type: 'int', default: 0 })
  returningCustomers: number;

  @Column({ name: 'tinh_toan_tai', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  computedAt: Date;
}
