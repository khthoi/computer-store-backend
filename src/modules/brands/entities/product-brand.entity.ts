import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Brand } from './brand.entity';

@Entity('san_pham_thuong_hieu')
@Index('uq_sp_th', ['sanPhamId', 'thuongHieuId'], { unique: true })
export class ProductBrand {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'san_pham_id' })
  sanPhamId: number;

  @ManyToOne(() => Product, { nullable: false, eager: false })
  @JoinColumn({ name: 'san_pham_id' })
  product: Product;

  @Column({ name: 'thuong_hieu_id' })
  thuongHieuId: number;

  @ManyToOne(() => Brand, { nullable: false, eager: false })
  @JoinColumn({ name: 'thuong_hieu_id' })
  brand: Brand;
}
