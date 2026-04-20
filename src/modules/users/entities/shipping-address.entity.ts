import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('dia_chi_giao_hang')
export class ShippingAddress {
  @PrimaryGeneratedColumn({ name: 'dia_chi_id' })
  id: number;

  @Column({ name: 'khach_hang_id' })
  khachHangId: number;

  @ManyToOne(() => Customer, (customer) => customer.addresses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'khach_hang_id' })
  customer: Customer;

  @Column({ name: 'ho_ten_nguoi_nhan', length: 255 })
  hoTenNguoiNhan: string;

  @Column({ name: 'so_dien_thoai_nhan', length: 20 })
  soDienThoaiNhan: string;

  @Column({ name: 'dia_chi_chi_tiet', length: 500 })
  diaChiChiTiet: string;

  @Column({ name: 'quan_huyen', length: 200 })
  quanHuyen: string;

  @Column({ name: 'tinh_thanh_pho', length: 200 })
  tinhThanhPho: string;

  @Column({ name: 'la_mac_dinh', default: false })
  laMacDinh: boolean;
}
