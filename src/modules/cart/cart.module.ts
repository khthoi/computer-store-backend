import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Cart, CartItem]), AuditLogsModule, PromotionsModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
