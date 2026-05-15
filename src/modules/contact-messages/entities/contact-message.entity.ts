import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';

export enum ContactMessageStatus {
  NEW = 'moi',
  RESOLVED = 'da_xu_ly',
}

@Entity('lien_he_form')
@Index('idx_contact_status', ['status'])
@Index('idx_contact_ip', ['ipAddress'])
export class ContactMessage {
  @PrimaryGeneratedColumn({ name: 'lien_he_id' })
  id: number;

  @Column({ name: 'ho_ten', length: 150 })
  fullName: string;

  @Column({ name: 'email', length: 150 })
  email: string;

  @Column({ name: 'so_dien_thoai', length: 30, nullable: true })
  phone: string | null;

  @Column({ name: 'chu_de', length: 100 })
  subject: string;

  @Column({ name: 'noi_dung', type: 'text' })
  message: string;

  @Column({ name: 'dia_chi_ip', length: 64, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', length: 500, nullable: true })
  userAgent: string | null;

  @Column({
    name: 'trang_thai',
    type: 'enum',
    enum: ContactMessageStatus,
    default: ContactMessageStatus.NEW,
  })
  status: ContactMessageStatus;

  @Column({ name: 'ghi_chu_admin', type: 'text', nullable: true })
  adminNote: string | null;

  @Column({ name: 'nguoi_xu_ly_id', nullable: true })
  resolvedById: number | null;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'nguoi_xu_ly_id' })
  resolvedByEmployee: Employee | null;

  @Column({ name: 'ngay_xu_ly', type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'ngay_tao' })
  createdAt: Date;
}
