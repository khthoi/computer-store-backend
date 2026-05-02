import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SavedBuild } from './saved-build.entity';
import { BuildSlot } from './build-slot.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';

@Entity('buildpc_chi_tiet')
export class BuildDetail {
  @PrimaryGeneratedColumn({ name: 'chi_tiet_id' })
  id: number;

  @Column({ name: 'build_id' })
  buildId: number;

  @Column({ name: 'slot_id' })
  slotId: number;

  @ManyToOne(() => BuildSlot, { nullable: false, eager: false })
  @JoinColumn({ name: 'slot_id' })
  slot: BuildSlot;

  @Column({ name: 'phien_ban_id' })
  phienBanId: number;

  @ManyToOne(() => ProductVariant, { nullable: false, eager: false })
  @JoinColumn({ name: 'phien_ban_id' })
  phienBan: ProductVariant;

  @Column({ name: 'so_luong', type: 'tinyint', default: 1 })
  soLuong: number;

  @Column({ name: 'gia_snapshot', type: 'decimal', precision: 18, scale: 2, nullable: true })
  giaSnapshot: number | null;

  @Column({ name: 'thu_tu', type: 'smallint', default: 0 })
  thuTu: number;

  @ManyToOne(() => SavedBuild, (b) => b.details, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'build_id' })
  build: SavedBuild;
}
