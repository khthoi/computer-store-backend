import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('ghi_chu_don_hang')
@Index('idx_gcddh_don_hang', ['donHangId'])
export class OrderNote {
  @PrimaryGeneratedColumn({ name: 'ghi_chu_id' })
  id: number;

  @Column({ name: 'don_hang_id' })
  donHangId: number;

  @ManyToOne(() => Order, { nullable: false, eager: false })
  @JoinColumn({ name: 'don_hang_id' })
  donHang: Order;

  @Column({ name: 'nhan_vien_id', nullable: true })
  nhanVienId: number | null;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'nhan_vien_id' })
  nhanVien: Employee | null;

  @Column({ name: 'ten_tac_gia', length: 100 })
  tenTacGia: string;

  @Column({ name: 'vai_tro_tac_gia', length: 50 })
  vaiTroTacGia: string;

  @Column({ name: 'noi_dung', type: 'text' })
  noiDung: string;

  @CreateDateColumn({ name: 'ngay_tao' })
  ngayTao: Date;
}
