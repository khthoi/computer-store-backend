import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { ReturnRequest } from './return-request.entity';
import { MediaAsset } from '../../media/entities/media-asset.entity';

@Entity('yeu_cau_doi_tra_asset')
@Index('idx_return_asset_request', ['returnRequestId'])
export class ReturnAsset {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'yeu_cau_id' })
  returnRequestId: number;

  @ManyToOne(() => ReturnRequest, { nullable: false, eager: false })
  @JoinColumn({ name: 'yeu_cau_id' })
  returnRequest: ReturnRequest;

  @Column({ name: 'asset_id' })
  assetId: number;

  @ManyToOne(() => MediaAsset, { nullable: false, eager: false })
  @JoinColumn({ name: 'asset_id' })
  asset: MediaAsset;

  @Column({ name: 'thu_tu', type: 'tinyint', default: 0 })
  sortOrder: number;

  @Column({ name: 'loai_asset', length: 30, default: 'customer_evidence' })
  loaiAsset: 'customer_evidence' | 'inspection_evidence';
}
