import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('report_inventory_health')
export class InventoryHealthReport {
  @PrimaryColumn({ name: 'phien_ban_id', type: 'int' })
  variantId: number;

  @Column({ name: 'so_luong_ton', type: 'int', default: 0 })
  stockQty: number;

  @Column({ name: 'nguong_canh_bao', type: 'int', default: 0 })
  lowStockThreshold: number;

  @Column({ name: 'ban_trung_binh_ngay_30d', type: 'decimal', precision: 8, scale: 2, default: 0 })
  avgDailySold30d: number;

  @Column({ name: 'ban_trung_binh_ngay_90d', type: 'decimal', precision: 8, scale: 2, default: 0 })
  avgDailySold90d: number;

  // Days of Inventory — how many days of stock remain at current sales rate
  @Column({ name: 'doi', type: 'int', default: 0 })
  daysOfInventory: number;

  @Column({ name: 'bucket', length: 20 })
  bucket: string;

  @Column({ name: 'gia_tri_ton_uoc_tinh', type: 'bigint', default: 0 })
  estimatedStockValue: number;

  @Column({ name: 'ngay_ban_cuoi', type: 'date', nullable: true })
  lastSoldDate: string | null;

  @Column({ name: 'so_ngay_khong_ban', type: 'int', default: 0 })
  daysSinceLastSold: number;

  @Column({ name: 'tinh_toan_tai', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  computedAt: Date;
}
