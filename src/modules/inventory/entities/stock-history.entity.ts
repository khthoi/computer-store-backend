import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type LoaiGiaoDich = 'Nhap' | 'Xuat' | 'HoanTra' | 'Huy' | 'DieuChinh';

@Entity('lich_su_nhap_xuat')
@Index('idx_lsnx_phienban', ['phienBanId'])
@Index('idx_lsnx_kho', ['khoId'])
@Index('idx_lsnx_donhang', ['donHangId'])
export class StockHistory {
  @PrimaryGeneratedColumn({ name: 'lich_su_nx_id' })
  id: number;

  @Column({ name: 'phien_ban_id' })
  phienBanId: number;

  @Column({ name: 'kho_id' })
  khoId: number;

  @Column({ name: 'loai_giao_dich', length: 20 })
  loaiGiaoDich: LoaiGiaoDich;

  @Column({ name: 'so_luong' })
  soLuong: number;

  @Column({ name: 'don_hang_id', nullable: true })
  donHangId: number | null;

  @Column({ name: 'phieu_nhap_id', nullable: true })
  phieuNhapId: number | null;

  @Column({ name: 'nguoi_thuc_hien_id', nullable: true })
  nguoiThucHienId: number | null;

  @CreateDateColumn({ name: 'thoi_diem' })
  thoiDiem: Date;

  @Column({ name: 'ghi_chu', type: 'text', nullable: true })
  ghiChu: string | null;
}
