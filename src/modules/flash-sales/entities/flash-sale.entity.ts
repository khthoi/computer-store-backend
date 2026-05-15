import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FlashSaleItem } from './flash-sale-item.entity';
import { Employee } from '../../employees/entities/employee.entity';

export enum FlashSaleStatus {
  /**
   * Admin-approved. Customer-facing visibility is additionally gated by
   * the (batDau, ketThuc) time window — both must be satisfied.
   */
  ACTIVE = 'active',
  /** Admin paused — never shown on the storefront, regardless of time window. */
  PAUSED = 'paused',
}

@Entity('flash_sale')
@Index('idx_fs_status', ['trangThai'])
@Index('idx_fs_dates', ['batDau', 'ketThuc'])
export class FlashSale {
  @PrimaryGeneratedColumn({ name: 'flash_sale_id' })
  id: number;

  @Column({ name: 'ten', length: 300 })
  ten: string;

  @Column({ name: 'mo_ta', type: 'text', nullable: true })
  moTa: string | null;

  @Column({ name: 'trang_thai', type: 'varchar', length: 20, default: 'active' })
  trangThai: FlashSaleStatus;

  @Column({ name: 'bat_dau', type: 'datetime' })
  batDau: Date;

  @Column({ name: 'ket_thuc', type: 'datetime' })
  ketThuc: Date;

  @Column({ name: 'banner_title', length: 500, nullable: true })
  bannerTitle: string | null;

  @Column({ name: 'banner_image_url', type: 'text', nullable: true })
  bannerImageUrl: string | null;

  @Column({ name: 'created_by' })
  createdBy: number;

  @ManyToOne(() => Employee, { nullable: false, eager: false })
  @JoinColumn({ name: 'created_by' })
  createdByEmployee: Employee;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'banner_alt', type: 'text', nullable: true })
  bannerAlt: string | null;

  @Column({ name: 'asset_id_banner', nullable: true })
  assetIdBanner: number | null;

  @OneToMany(() => FlashSaleItem, (i) => i.flashSale, { cascade: true })
  items: FlashSaleItem[];
}
