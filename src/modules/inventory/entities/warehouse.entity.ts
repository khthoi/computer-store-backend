import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('kho_hang')
export class Warehouse {
  @PrimaryGeneratedColumn({ name: 'kho_id' })
  id: number;

  @Column({ name: 'ma_kho', length: 255 })
  @Index('uq_kh_mako', { unique: true })
  maKho: string;

  @Column({ name: 'ten_kho', length: 200 })
  tenKho: string;

  @Column({ name: 'dia_chi_kho', length: 500 })
  diaChiKho: string;

  @Column({ name: 'trang_thai', length: 20, default: 'HoatDong' })
  trangThai: string;

  @Column({ name: 'nguoi_phu_trach_id', nullable: true })
  nguoiPhuTrachId: number | null;
}
