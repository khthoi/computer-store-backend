import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProductVariant } from '../../products/entities/product-variant.entity';
import { SpecType } from './spec-type.entity';

@Entity('gia_tri_thong_so')
@Index('uq_gtts_variant_type', ['phienBanId', 'loaiThongSoId'], { unique: true })
export class SpecValue {
  @PrimaryGeneratedColumn({ name: 'thong_so_id' })
  id: number;

  @Column({ name: 'phien_ban_id' })
  phienBanId: number;

  @ManyToOne(() => ProductVariant, { nullable: false, eager: false })
  @JoinColumn({ name: 'phien_ban_id' })
  phienBan: ProductVariant;

  @Column({ name: 'loai_thong_so_id' })
  loaiThongSoId: number;

  @ManyToOne(() => SpecType, { nullable: false, eager: false })
  @JoinColumn({ name: 'loai_thong_so_id' })
  loaiThongSo: SpecType;

  @Column({ name: 'gia_tri_thong_so', type: 'text' })
  giaTriThongSo: string;

  @Column({ name: 'gia_tri_chuan', length: 100, nullable: true })
  giaTriChuan: string | null;

  @Column({ name: 'gia_tri_so', type: 'decimal', precision: 18, scale: 4, nullable: true })
  giaTriSo: number | null;
}
