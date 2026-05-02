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
import { BuildDetail } from './build-detail.entity';
import { Customer } from '../../users/entities/customer.entity';

@Entity('buildpc_da_luu')
export class SavedBuild {
  @PrimaryGeneratedColumn({ name: 'build_id' })
  id: number;

  @Column({ name: 'khach_hang_id', nullable: true })
  khachHangId: number | null;

  @ManyToOne(() => Customer, { nullable: true, eager: false })
  @JoinColumn({ name: 'khach_hang_id' })
  khachHang: Customer | null;

  @Column({ name: 'ten_build', length: 200, default: 'Cấu hình của tôi' })
  tenBuild: string;

  @Column({ name: 'mo_ta', type: 'text', nullable: true })
  moTa: string | null;

  @Column({ name: 'tong_gia_uoc_tinh', type: 'decimal', precision: 18, scale: 2, nullable: true })
  tongGiaUocTinh: number | null;

  @Column({ name: 'tong_tdp', type: 'smallint', nullable: true })
  tongTdp: number | null;

  @Column({ name: 'trang_thai', length: 20, default: 'draft' })
  trangThai: string; // 'draft' | 'complete' | 'shared'

  @Column({ name: 'is_public', type: 'tinyint', default: 0 })
  isPublic: boolean;

  @Column({ nullable: true, length: 200 })
  @Index('uq_build_slug', { unique: true })
  slug: string | null;

  @Column({ name: 'so_luot_xem', unsigned: true, default: 0 })
  soLuotXem: number;

  @Column({ name: 'so_luot_clone', unsigned: true, default: 0 })
  soLuotClone: number;

  @CreateDateColumn({ name: 'ngay_tao' })
  ngayTao: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  ngayCapNhat: Date;

  @OneToMany(() => BuildDetail, (d) => d.build, { cascade: true })
  details: BuildDetail[];
}
