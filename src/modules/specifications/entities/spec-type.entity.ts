import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SpecGroup } from './spec-group.entity';

@Entity('loai_thong_so')
export class SpecType {
  @PrimaryGeneratedColumn({ name: 'loai_thong_so_id' })
  id: number;

  @Column({ name: 'nhom_thong_so_id' })
  nhomThongSoId: number;

  @Column({ name: 'ten_loai', length: 255 })
  tenLoai: string;

  @Column({ name: 'ma_ky_thuat', length: 50, nullable: true })
  @Index('uq_lts_makyth', { unique: true })
  maKyThuat: string | null;

  @Column({ name: 'kieu_du_lieu', length: 20, default: 'text' })
  kieuDuLieu: string; // 'text' | 'number' | 'boolean' | 'enum'

  @Column({ name: 'don_vi', length: 20, nullable: true })
  donVi: string | null;

  @Column({ name: 'co_the_loc', default: false })
  coTheLoc: boolean;

  @Column({ name: 'widget_loc', length: 20, nullable: true })
  widgetLoc: string | null; // 'checkbox' | 'range' | 'toggle' | 'select' | 'combo-select'

  @Column({ name: 'thu_tu_loc', type: 'smallint', default: 0 })
  thuTuLoc: number;

  @Column({ name: 'thu_tu_hien_thi', type: 'smallint', default: 0 })
  thuTuHienThi: number;

  @Column({ name: 'bat_buoc', length: 20, default: 'BAT_BUOC' })
  batBuoc: string; // 'BAT_BUOC' | 'TUY_CHON'

  @Column({ name: 'mo_ta', type: 'text', nullable: true })
  moTa: string | null;

  @ManyToOne(() => SpecGroup, (g) => g.types, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nhom_thong_so_id' })
  group: SpecGroup;
}
