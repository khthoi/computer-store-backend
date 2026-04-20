import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Brand } from './entities/brand.entity';
import { ProductBrand } from './entities/product-brand.entity';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';
import { AdminBrandsController } from './admin-brands.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Brand, ProductBrand])],
  controllers: [BrandsController, AdminBrandsController],
  providers: [BrandsService],
  exports: [BrandsService, TypeOrmModule],
})
export class BrandsModule {}
