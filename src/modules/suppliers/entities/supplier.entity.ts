import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type TrangThaiNCC = 'DangHopTac' | 'NgungHopTac';

@Entity('nha_cung_cap')
export class Supplier {
  @PrimaryGeneratedColumn({ name: 'nha_cung_cap_id' })
  id: number;

  @Column({ name: 'ten_nha_cung_cap', length: 300 })
  tenNhaCungCap: string;

  @Column({ name: 'email', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'so_dien_thoai', length: 20, nullable: true })
  soDienThoai: string | null;

  @Column({ name: 'dia_chi', length: 500, nullable: true })
  diaChi: string | null;

  @Column({ name: 'nguoi_lien_he', length: 255, nullable: true })
  nguoiLienHe: string | null;

  @Column({ name: 'trang_thai', length: 30, default: 'DangHopTac' })
  trangThai: TrangThaiNCC;

  @Column({ name: 'lead_time_days', default: 7 })
  leadTimeDays: number;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string | null;

  @CreateDateColumn({ name: 'ngay_tao' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  updatedAt: Date;
}
