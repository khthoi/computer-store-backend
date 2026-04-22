import {
  Entity, PrimaryGeneratedColumn, Column, Index,
} from 'typeorm';

@Entity('yeu_cau_doi_tra_asset')
@Index('idx_return_asset_request', ['returnRequestId'])
export class ReturnAsset {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'yeu_cau_id' })
  returnRequestId: number;

  @Column({ name: 'asset_id' })
  assetId: number;

  @Column({ name: 'thu_tu', type: 'tinyint', default: 0 })
  sortOrder: number;
}
