import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('quyen')
@Index('idx_q_module_hd', ['module', 'hanhDong'])
export class Permission {
  @PrimaryGeneratedColumn({ name: 'quyen_id' })
  id: number;

  @Column({ name: 'ma_quyen', length: 100 })
  @Index('uq_q_maquyen', { unique: true })
  maQuyen: string; // e.g. 'product.read', 'order.update'

  @Column({ name: 'ten_quyen', length: 200 })
  tenQuyen: string;

  @Column({ length: 100 })
  module: string; // e.g. 'product', 'order'

  @Column({ name: 'hanh_dong', length: 20 })
  hanhDong: string; // 'read' | 'create' | 'update' | 'delete'

  @Column({ name: 'mo_ta', length: 500, nullable: true })
  moTa: string | null;
}
