import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum OrderActivityStatus {
  CHO_XU_LY          = 'ChoXuLy',
  DA_XAC_NHAN        = 'DaXacNhan',
  DANG_XU_LY         = 'DangXuLy',
  DANG_CHUAN_BI_HANG = 'DangChuanBiHang',
  CHUAN_BI_BAN_GIAO  = 'ChuanBiBanGiao',
  DANG_GIAO          = 'DangGiao',
  DA_GIAO            = 'DaGiao',
}

@Entity('nhat_ky_don_hang')
@Index('idx_nkdh_donhang', ['donHangId'])
export class OrderActivityLog {
  @PrimaryGeneratedColumn({ name: 'nhat_ky_id' })
  id: number;

  @Column({ name: 'don_hang_id' })
  donHangId: number;

  @Column({ name: 'ten_nguoi_thuc_hien', length: 100 })
  actorName: string;

  @Column({ name: 'vai_tro', length: 50 })
  actorRole: string;

  @Column({ name: 'nguoi_thuc_hien_id', nullable: true })
  actorId: number | null;

  @Column({ name: 'hanh_dong', length: 200 })
  action: string;

  @Column({ name: 'chi_tiet', type: 'text', nullable: true })
  detail: string | null;

  // Populated for status-change events; null for all other event types
  @Column({ name: 'trang_thai_don', type: 'varchar', length: 30, nullable: true })
  trangThaiDon: OrderActivityStatus | null;

  @CreateDateColumn({ name: 'thoi_diem' })
  timestamp: Date;
}
