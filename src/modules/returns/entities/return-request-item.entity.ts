import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ReturnRequest } from './return-request.entity';
import { ProductVariant } from '../../products/entities/product-variant.entity';

@Entity('yeu_cau_doi_tra_chi_tiet')
@Index('idx_ycdt_ct_yeu_cau', ['yeuCauId'])
export class ReturnRequestItem {
  @PrimaryGeneratedColumn({ name: 'chi_tiet_yc_id' })
  id: number;

  @Column({ name: 'yeu_cau_id' })
  yeuCauId: number;

  @ManyToOne(() => ReturnRequest, { nullable: false, eager: false })
  @JoinColumn({ name: 'yeu_cau_id' })
  yeuCau: ReturnRequest;

  @Column({ name: 'phien_ban_id' })
  phienBanId: number;

  @ManyToOne(() => ProductVariant, { nullable: false, eager: false })
  @JoinColumn({ name: 'phien_ban_id' })
  phienBan: ProductVariant;

  @Column({ name: 'so_luong' })
  soLuong: number;
}
