import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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
}
