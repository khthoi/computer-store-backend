import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('nhat_ky_he_thong')
export class SystemAuditLog {
  @PrimaryGeneratedColumn({ unsigned: true, type: 'bigint' })
  id: number;

  @Column({ name: 'loai_doi_tuong', length: 50 })
  @Index('idx_nkht_loai_doi_tuong')
  entityType: string;

  @Column({ name: 'id_doi_tuong', length: 100 })
  @Index('idx_nkht_id_doi_tuong')
  entityId: string;

  @Column({ name: 'ten_doi_tuong', length: 255 })
  entityLabel: string;

  @Column({ name: 'loai_hanh_dong', length: 50 })
  @Index('idx_nkht_loai_hanh_dong')
  actionType: string;

  @Column({ name: 'mo_ta_hanh_dong', length: 500 })
  actionDetail: string;

  @Column({ name: 'id_nguoi_thuc_hien', type: 'int', unsigned: true, nullable: true })
  @Index('idx_nkht_id_nguoi_thuc_hien')
  actorId: number | null;

  @Column({ name: 'ten_nguoi_thuc_hien', length: 255, default: '' })
  actorName: string;

  @Column({ name: 'ma_nguoi_thuc_hien', length: 50, nullable: true })
  actorCode: string | null;

  // Stored as JSON array string: ["Role1", "Role2"] — text to support multiple roles
  @Column({ name: 'vai_tro_nguoi_thuc_hien', type: 'text', default: '' })
  actorRole: string;

  @Column({ name: 'avatar_nguoi_thuc_hien', length: 500, nullable: true })
  actorAvatarUrl: string | null;

  @Column({ name: 'du_lieu_truoc', type: 'longtext', nullable: true })
  before: string | null;

  @Column({ name: 'du_lieu_sau', type: 'longtext', nullable: true })
  after: string | null;

  @Column({ name: 'dia_chi_ip', length: 50, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', length: 500, nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'tao_luc' })
  @Index('idx_nkht_tao_luc')
  createdAt: Date;
}
