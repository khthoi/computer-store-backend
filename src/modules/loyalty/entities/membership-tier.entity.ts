import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('hang_thanh_vien')
export class MembershipTier {
  @PrimaryGeneratedColumn({ name: 'hang_id' })
  id: number;

  /** Slug dùng trong code / API: Bronze | Silver | Gold | Platinum */
  @Column({ name: 'ten_hang', length: 50, unique: true })
  name: string;

  /** Nhãn hiển thị tiếng Việt */
  @Column({ name: 'nhan_hien_thi', length: 100 })
  displayName: string;

  @Column({ name: 'diem_tu', type: 'int', default: 0 })
  minPoints: number;

  /** null = không giới hạn trên (hạng cao nhất) */
  @Column({ name: 'diem_den', type: 'int', nullable: true })
  maxPoints: number | null;

  /** Mã màu hex cho UI */
  @Column({ name: 'mau_sac', length: 20, nullable: true })
  color: string | null;

  @Column({ name: 'mo_ta', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'thu_tu', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'hoat_dong', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'ngay_tao' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  updatedAt: Date;
}
