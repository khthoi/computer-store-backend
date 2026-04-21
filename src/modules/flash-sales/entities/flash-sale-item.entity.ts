import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { FlashSale } from './flash-sale.entity';

@Entity('flash_sale_item')
@Index('uq_fsi_sale_variant', ['flashSaleId', 'phienBanId'], { unique: true })
export class FlashSaleItem {
  @PrimaryGeneratedColumn({ name: 'flash_sale_item_id' })
  id: number;

  @Column({ name: 'flash_sale_id' })
  flashSaleId: number;

  @Column({ name: 'phien_ban_id' })
  phienBanId: number;

  @Column({ name: 'gia_flash', type: 'decimal', precision: 18, scale: 2 })
  giaFlash: number;

  @Column({ name: 'gia_goc_snapshot', type: 'decimal', precision: 18, scale: 2 })
  giaGocSnapshot: number;

  @Column({ name: 'so_luong_gioi_han' })
  soLuongGioiHan: number;

  @Column({ name: 'so_luong_da_ban', default: 0 })
  soLuongDaBan: number;

  @Column({ name: 'thu_tu_hien_thi', default: 1 })
  thuTuHienThi: number;

  @ManyToOne(() => FlashSale, (fs) => fs.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'flash_sale_id' })
  flashSale: FlashSale;
}
