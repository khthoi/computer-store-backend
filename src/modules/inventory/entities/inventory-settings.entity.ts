import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export type PhuongPhapXuatKho = 'FIFO' | 'LIFO' | 'AVERAGE_COST';

@Entity('cai_dat_kho')
export class InventorySettings {
  @PrimaryGeneratedColumn({ name: 'cai_dat_id' })
  id: number;

  @Column({ name: 'phuong_phap_xuat_kho', length: 20, default: 'FIFO' })
  phuongPhapXuatKho: PhuongPhapXuatKho;
}
