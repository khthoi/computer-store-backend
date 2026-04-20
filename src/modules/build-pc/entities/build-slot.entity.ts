import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('buildpc_slot_dinh_nghia')
export class BuildSlot {
  @PrimaryGeneratedColumn({ name: 'slot_id' })
  id: number;

  @Column({ name: 'ten_slot', length: 50 })
  tenSlot: string;

  @Column({ name: 'danh_muc_id' })
  danhMucId: number;

  @Column({ name: 'bat_buoc', type: 'tinyint', default: 1 })
  batBuoc: boolean;

  @Column({ name: 'so_luong_min', type: 'tinyint', default: 1 })
  soLuongMin: number;

  @Column({ name: 'so_luong_max', type: 'tinyint', default: 1 })
  soLuongMax: number;

  @Column({ name: 'thu_tu', type: 'smallint', default: 0 })
  thuTu: number;

  @Column({ name: 'icon_key', length: 50, nullable: true })
  iconKey: string | null;
}
