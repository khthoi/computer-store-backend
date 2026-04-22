import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { globalValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = new Logger('Bootstrap');

  // Security headers
  app.use(helmet());

  // Cookie parser (for HttpOnly refresh token)
  app.use(cookieParser());

  // CORS - đọc danh sách origin từ biến môi trường CORS_ORIGINS
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global Pipes
  app.useGlobalPipes(globalValidationPipe);

  // Global Filters
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(),
  );

  // Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Computer Store API')
    .setDescription('Hệ thống Bán lẻ Máy tính & Linh kiện Trực tuyến — REST API')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    // Phase 1 — Auth · Users · Employees · Roles
    .addTag('Auth', 'Xác thực & phân quyền')
    .addTag('Users', 'Quản lý tài khoản khách hàng')
    .addTag('Admin — Customers', 'Quản lý tài khoản khách hàng (admin)')
    .addTag('Admin — Employees', 'Quản lý nhân viên')
    .addTag('Admin — Roles', 'Quản lý vai trò & phân quyền')
    .addTag('Admin — Permissions', 'Quản lý quyền hạn')
    // Phase 2 — Categories · Brands · Specs · Products · Media · BuildPC
    .addTag('Categories', 'Danh mục sản phẩm')
    .addTag('Admin — Categories', 'Quản lý danh mục sản phẩm (admin)')
    .addTag('Brands', 'Thương hiệu sản phẩm')
    .addTag('Admin — Brands', 'Quản lý thương hiệu (admin)')
    .addTag('Specifications', 'Thông số kỹ thuật')
    .addTag('Admin — Specifications', 'Quản lý thông số kỹ thuật (admin)')
    .addTag('Products', 'Sản phẩm & biến thể')
    .addTag('Admin — Products', 'Quản lý sản phẩm & biến thể (admin)')
    .addTag('Media', 'Thư viện media')
    .addTag('Admin — Media', 'Quản lý thư viện media (admin)')
    .addTag('BuildPC', 'Xây dựng cấu hình PC')
    .addTag('Admin — BuildPC', 'Quản lý cấu hình PC (admin)')
    // Phase 3 — Cart · Orders · Payments
    .addTag('Cart', 'Giỏ hàng')
    .addTag('Orders', 'Đơn hàng')
    .addTag('Admin — Orders', 'Quản lý đơn hàng (admin)')
    .addTag('Payments', 'Thanh toán')
    // Phase 4 — Inventory · Suppliers
    .addTag('Inventory', 'Tồn kho')
    .addTag('Admin — Inventory', 'Quản lý kho hàng (admin)')
    .addTag('Suppliers', 'Nhà cung cấp')
    .addTag('Admin — Suppliers', 'Quản lý nhà cung cấp (admin)')
    // Phase 5 — Promotions · Flash Sales · Loyalty
    .addTag('Promotions', 'Khuyến mãi')
    .addTag('Admin — Promotions', 'Quản lý khuyến mãi (admin)')
    .addTag('Flash Sales', 'Flash sale đang diễn ra')
    .addTag('Admin — Flash Sales', 'Quản lý flash sale (admin)')
    .addTag('Loyalty', 'Điểm tích lũy')
    .addTag('Admin — Loyalty', 'Quản lý điểm tích lũy (admin)')
    // Phase 6 — Reviews · Returns · Support
    .addTag('Reviews', 'Đánh giá sản phẩm')
    .addTag('Admin — Reviews', 'Kiểm duyệt đánh giá sản phẩm (admin)')
    .addTag('Returns', 'Yêu cầu đổi/trả hàng')
    .addTag('Admin — Returns', 'Quản lý yêu cầu đổi/trả (admin)')
    .addTag('Support', 'Ticket hỗ trợ khách hàng')
    .addTag('Admin — Support', 'Quản lý ticket hỗ trợ (admin)')
    // Phase 7 — Notifications · Wishlist · Search
    .addTag('Notifications', 'Thông báo cá nhân')
    .addTag('Admin — Notifications', 'Quản lý cấu hình thông báo tự động (admin)')
    .addTag('Wishlist', 'Danh sách sản phẩm yêu thích')
    .addTag('Search', 'Tìm kiếm & gợi ý sản phẩm')
    // Phase 8 — CMS
    .addTag('CMS', 'Nội dung trang web (banners, pages, FAQ, menus, popups)')
    .addTag('Admin — CMS', 'Quản lý nội dung trang web (admin)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  logger.log(`Application running on: http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
