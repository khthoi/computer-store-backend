import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';

@Entity('nhan_vien')
export class Employee {
  @PrimaryGeneratedColumn({ name: 'nhan_vien_id' })
  id: number;

  @Column({ name: 'ma_nhan_vien', length: 255 })
  @Index('uq_nv_manhanvien', { unique: true })
  maNhanVien: string;

  @Column({ length: 255 })
  @Index('uq_nv_email', { unique: true })
  email: string;

  @Column({ name: 'ho_ten', length: 255 })
  hoTen: string;

  @Column({ name: 'gioi_tinh', length: 20, nullable: true })
  gioiTinh: string | null; // 'Male' | 'Female' | 'Undefined'

  @Column({ name: 'so_dien_thoai', length: 20, nullable: true })
  soDienThoai: string | null;

  @Column({ name: 'ngay_sinh', type: 'date', nullable: true })
  ngaySinh: Date | null;

  @Column({ name: 'ngay_vao_lam', type: 'date', nullable: true })
  ngayVaoLam: Date | null;

  @Column({ name: 'mat_khau_hash', length: 255, select: false })
  matKhauHash: string;

  @Column({ name: 'anh_dai_dien', type: 'text', nullable: true })
  anhDaiDien: string | null;

  @Column({ name: 'trang_thai', length: 20, default: 'DangLam' })
  @Index('idx_nv_trangthai')
  trangThai: string; // 'DangLam' | 'NghiViec'

  @CreateDateColumn({ name: 'ngay_tao' })
  ngayTao: Date;

  @Column({ name: 'dang_nhap_cuoi', type: 'datetime', nullable: true })
  dangNhapCuoi: Date | null;

  @Column({ name: 'asset_id_avatar', nullable: true })
  assetIdAvatar: number | null;

  @ManyToMany(() => Role, { eager: false })
  @JoinTable({
    name: 'nhan_vien_vai_tro',
    joinColumn: { name: 'nhan_vien_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'vai_tro_id', referencedColumnName: 'id' },
  })
  roles: Role[];
}
