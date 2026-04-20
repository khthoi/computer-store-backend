import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductsService } from './products.service';
import { ProductsSearchService } from './products-search.service';
import { ProductsController } from './products.controller';
import { AdminProductsController } from './admin-products.controller';
import { BrandsModule } from '../brands/brands.module';
import { SpecificationsModule } from '../specifications/specifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductVariant, ProductImage]), BrandsModule, SpecificationsModule],
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService, ProductsSearchService],
  exports: [ProductsService, ProductsSearchService, TypeOrmModule],
})
export class ProductsModule {}
