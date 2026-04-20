import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { SpecType } from './spec-type.entity';

@Entity('nhom_thong_so')
export class SpecGroup {
  @PrimaryGeneratedColumn({ name: 'nhom_thong_so_id' })
  id: number;

  @Column({ name: 'ten_nhom', length: 255 })
  tenNhom: string;

  @OneToMany(() => SpecType, (t) => t.group)
  types: SpecType[];
}
