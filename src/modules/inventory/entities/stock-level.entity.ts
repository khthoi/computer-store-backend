import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Index } from 'typeorm';

@Entity('ton_kho')
@Index('uq_tk_phienban_kho', ['phienBanId', 'khoId'], { unique: true })
export class StockLevel {
  @PrimaryGeneratedColumn({ name: 'ton_kho_id' })
  id: number;

  @Column({ name: 'phien_ban_id' })
  phienBanId: number;

  @Column({ name: 'kho_id' })
  khoId: number;

  @Column({ name: 'so_luong_ton', default: 0 })
  soLuongTon: number;

  @Column({ name: 'nguong_canh_bao', default: 5 })
  nguongCanhBao: number;

  @Column({ name: 'vi_tri_luu_tru', length: 100, nullable: true })
  viTriLuuTru: string | null;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  ngayCapNhat: Date;
}
