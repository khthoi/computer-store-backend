import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('gia_tri_thong_so')
@Index('uq_gtts_variant_type', ['phienBanId', 'loaiThongSoId'], { unique: true })
export class SpecValue {
  @PrimaryGeneratedColumn({ name: 'thong_so_id' })
  id: number;

  @Column({ name: 'phien_ban_id' })
  phienBanId: number;

  @Column({ name: 'loai_thong_so_id' })
  loaiThongSoId: number;

  @Column({ name: 'gia_tri_thong_so', type: 'text' })
  giaTriThongSo: string;

  @Column({ name: 'gia_tri_chuan', length: 100, nullable: true })
  giaTriChuan: string | null;

  @Column({ name: 'gia_tri_so', type: 'decimal', precision: 18, scale: 4, nullable: true })
  giaTriSo: number | null;
}
