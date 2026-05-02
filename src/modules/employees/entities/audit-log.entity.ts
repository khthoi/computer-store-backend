import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from './employee.entity';

@Entity('nhat_ky_nhan_vien')
export class AuditLog {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'nhan_vien_id' })
  @Index('idx_nknv_nhanvien')
  employeeId: number;

  @ManyToOne(() => Employee, { nullable: false, eager: false })
  @JoinColumn({ name: 'nhan_vien_id' })
  employee: Employee;

  @Column({ name: 'hanh_dong', length: 50 })
  action: string; // 'login' | 'logout' | 'profile_edit' | 'role_assign' | 'role_remove' | 'report_view'

  @Column({ name: 'chi_tiet', length: 500, nullable: true })
  details: string | null;

  @Column({ name: 'dia_chi_ip', length: 50, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'thoi_gian' })
  createdAt: Date;
}
