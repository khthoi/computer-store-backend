import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('danh_muc_nhom_thong_so')
@Index('uq_dm_nhom', ['danhMucId', 'nhomThongSoId'], { unique: true })
export class CategorySpecGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'danh_muc_id' })
  danhMucId: number;

  @Column({ name: 'nhom_thong_so_id' })
  nhomThongSoId: number;

  @Column({ name: 'thu_tu_hien_thi', type: 'smallint', default: 0 })
  thuTuHienThi: number;

  @Column({ name: 'hien_thi_bo_loc', default: false })
  hienThiBoLoc: boolean;

  @Column({ name: 'thu_tu_bo_loc', type: 'smallint', default: 0 })
  thuTuBoLoc: number;

  @Column({ name: 'hanh_dong', length: 20, default: 'hien_thi' })
  hanhDong: string; // 'hien_thi' | 'loai_tru' | 'ghi_de_thu_tu'
}
