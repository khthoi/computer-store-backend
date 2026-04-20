import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { Permission } from './permission.entity';

@Entity('vai_tro')
export class Role {
  @PrimaryGeneratedColumn({ name: 'vai_tro_id' })
  id: number;

  @Column({ name: 'ten_vai_tro', length: 100 })
  @Index('uq_vt_ten', { unique: true })
  tenVaiTro: string;

  @Column({ name: 'mo_ta', length: 500, nullable: true })
  moTa: string | null;

  @ManyToMany(() => Permission, { eager: false })
  @JoinTable({
    name: 'vai_tro_quyen',
    joinColumn: { name: 'vai_tro_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'quyen_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];
}
