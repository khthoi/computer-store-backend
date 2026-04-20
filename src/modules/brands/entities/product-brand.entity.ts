import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('san_pham_thuong_hieu')
@Index('uq_sp_th', ['sanPhamId', 'thuongHieuId'], { unique: true })
export class ProductBrand {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'san_pham_id' })
  sanPhamId: number;

  @Column({ name: 'thuong_hieu_id' })
  thuongHieuId: number;
}
