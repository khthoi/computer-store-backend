import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('hoan_tien_don_hang_chi_tiet')
@Index('idx_htdhct_hoan_tien', ['hoanTienId'])
export class OrderRefundItem {
  @PrimaryGeneratedColumn({ name: 'chi_tiet_hoan_id' })
  id: number;

  @Column({ name: 'hoan_tien_id' })
  hoanTienId: number;

  @Column({ name: 'phien_ban_id' })
  phienBanId: number;

  @Column({ name: 'so_luong' })
  soLuong: number;
}
