import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('yeu_cau_doi_tra_chi_tiet')
@Index('idx_ycdt_ct_yeu_cau', ['yeuCauId'])
export class ReturnRequestItem {
  @PrimaryGeneratedColumn({ name: 'chi_tiet_yc_id' })
  id: number;

  @Column({ name: 'yeu_cau_id' })
  yeuCauId: number;

  @Column({ name: 'phien_ban_id' })
  phienBanId: number;

  @Column({ name: 'so_luong' })
  soLuong: number;
}
