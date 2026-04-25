import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';

// Common
import { RedisModule } from './common/redis/redis.module';
import { MailModule } from './modules/mail/mail.module';

// Phase 1 — Xác thực & Phân quyền
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { RolesModule } from './modules/roles/roles.module';

// Phase 2 — Danh mục & Sản phẩm
import { MediaModule } from './modules/media/media.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BrandsModule } from './modules/brands/brands.module';
import { SpecificationsModule } from './modules/specifications/specifications.module';
import { ProductsModule } from './modules/products/products.module';
import { BuildPcModule } from './modules/build-pc/build-pc.module';

// Phase 3 — Giỏ hàng & Đặt hàng
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';

// Phase 4 — Kho hàng & Nhà cung cấp
import { InventoryModule } from './modules/inventory/inventory.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';

// Phase 5 — Khuyến mãi & Loyalty
import { PromotionsModule } from './modules/promotions/promotions.module';
import { FlashSalesModule } from './modules/flash-sales/flash-sales.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';

// Phase 6 — Reviews · Returns · Support
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { SupportModule } from './modules/support/support.module';

// Phase 7 — Notifications · Wishlist · Search
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { SearchModule } from './modules/search/search.module';

// Phase 8 — CMS
import { CmsModule } from './modules/cms/cms.module';

// Phase 9 — Reports & Settings
import { ReportsModule } from './modules/reports/reports.module';
import { SettingsModule } from './modules/settings/settings.module';

// Dashboard
import { DashboardModule } from './modules/dashboard/dashboard.module';

// Guards
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, redisConfig],
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...config.get('database'),
      }),
    }),

    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('redis.host'),
          port: config.get('redis.port'),
        },
      }),
    }),

    ScheduleModule.forRoot(),

    RedisModule,
    MailModule,

    // Phase 1
    AuthModule,
    UsersModule,
    EmployeesModule,
    RolesModule,

    // Phase 2
    MediaModule,
    CategoriesModule,
    BrandsModule,
    SpecificationsModule,
    ProductsModule,
    BuildPcModule,

    // Phase 3
    CartModule,
    OrdersModule,
    PaymentsModule,

    // Phase 4
    InventoryModule,
    SuppliersModule,

    // Phase 5
    PromotionsModule,
    FlashSalesModule,
    LoyaltyModule,

    // Phase 6
    ReviewsModule,
    ReturnsModule,
    SupportModule,

    // Phase 7
    NotificationsModule,
    WishlistModule,
    SearchModule,

    // Phase 8
    CmsModule,

    // Phase 9
    ReportsModule,
    SettingsModule,

    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
