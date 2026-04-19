# ARCHITECTURE.md — Project Structure & Infrastructure

## Full Directory Structure

```
computer-store-backend/
├── src/
│   ├── main.ts                          # Bootstrap: Swagger, global pipes, helmet, CORS
│   ├── app.module.ts                    # Root module — imports all feature modules
│   ├── app.controller.ts                # Health check endpoint
│   │
│   ├── config/                          # Environment configuration factories
│   │   ├── database.config.ts           # TypeORM DataSource options
│   │   ├── jwt.config.ts                # JWT secret + expiry
│   │   └── redis.config.ts              # Redis connection options
│   │
│   ├── common/                          # Shared across all modules
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts       # @Roles('permission.key')
│   │   │   ├── public.decorator.ts      # @Public() — bypass JwtAuthGuard
│   │   │   └── current-user.decorator.ts # @CurrentUser() param decorator
│   │   ├── filters/
│   │   │   └── global-exception.filter.ts # Uniform error response shape
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts        # Validates JWT, checks Redis blacklist
│   │   │   └── roles.guard.ts           # Checks @Roles() against JWT payload
│   │   ├── interceptors/
│   │   │   ├── response.interceptor.ts  # Wrap response: { success, data, meta }
│   │   │   └── logging.interceptor.ts   # Request/response logging
│   │   ├── pipes/
│   │   │   └── parse-positive-int.pipe.ts
│   │   ├── dto/
│   │   │   └── pagination.dto.ts        # page, limit, sortBy, sortOrder
│   │   └── enums/
│   │       ├── order-status.enum.ts
│   │       ├── payment-method.enum.ts
│   │       └── user-role.enum.ts
│   │
│   ├── database/
│   │   ├── migrations/                  # TypeORM migration files
│   │   └── seeds/                       # Seed scripts (roles, permissions, admin user)
│   │
│   ├── modules/
│   │   ├── auth/                        # Module 01
│   │   ├── users/                       # Module 02
│   │   ├── employees/                   # Module 03
│   │   ├── roles/                       # Module 04
│   │   ├── categories/                  # Module 05
│   │   ├── brands/                      # Module 06
│   │   ├── products/                    # Module 07
│   │   ├── specifications/              # Module 08
│   │   ├── build-pc/                    # Module 09
│   │   ├── media/                       # Module 10
│   │   ├── cart/                        # Module 11
│   │   ├── orders/                      # Module 12
│   │   ├── payments/                    # Module 13
│   │   ├── inventory/                   # Module 14
│   │   ├── suppliers/                   # Module 15
│   │   ├── promotions/                  # Module 16
│   │   ├── flash-sales/                 # Module 17
│   │   ├── loyalty/                     # Module 18
│   │   ├── reviews/                     # Module 19
│   │   ├── returns/                     # Module 20
│   │   ├── support/                     # Module 21
│   │   ├── notifications/               # Module 22
│   │   ├── wishlist/                    # Module 23
│   │   ├── search/                      # Module 24
│   │   ├── cms/                         # Module 25
│   │   ├── reports/                     # Module 26
│   │   └── settings/                    # Module 27
│   │
│   └── jobs/                            # BullMQ processors
│       ├── email.processor.ts           # Send transactional emails
│       ├── notification.processor.ts    # Push notifications
│       ├── report.processor.ts          # Nightly report snapshots
│       └── inventory-alert.processor.ts # Low-stock check every 1h
│
├── uploads/                             # Local file storage (dev only)
├── .ai/                                 # AI agent guidance docs
├── .env                                 # Local environment (not committed)
├── .env.example                         # Template for env setup
├── .env.local                           # Override for local dev
├── nest-cli.json
├── ormconfig.ts                         # TypeORM CLI config (migrations)
├── tsconfig.json
├── tsconfig.build.json
└── package.json
```

---

## Standard Module Internal Structure

```
src/modules/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts              # Public-facing routes
├── admin-<feature>.controller.ts        # Admin-only routes (separate file)
├── <feature>.service.ts                 # Core business logic
├── dto/
│   ├── create-<feature>.dto.ts
│   ├── update-<feature>.dto.ts
│   ├── query-<feature>.dto.ts           # Filters, pagination, sort
│   └── <feature>-response.dto.ts
└── entities/
    └── <entity>.entity.ts               # One entity per file
```

**Split service when > 300 lines:**
```
├── <feature>.service.ts                 # CRUD core
├── <feature>-query.service.ts           # Complex queries / filtering
└── <feature>-event.service.ts           # Event triggers (notify, loyalty, etc.)
```

---

## Infrastructure

### Ports
| Service | Port |
|---|---|
| NestJS Backend | 4000 |
| MySQL | 3306 |
| Redis | 6379 |
| Client Frontend (Next.js) | 3000 |
| Admin Frontend (Next.js) | 3001 |

### main.ts Bootstrap Order
```typescript
1. NestFactory.create(AppModule)
2. app.use(helmet())
3. app.enableCors({ origin: [':3000', ':3001'] })
4. app.useGlobalPipes(ValidationPipe { whitelist, forbidNonWhitelisted, transform })
5. app.useGlobalFilters(GlobalExceptionFilter)
6. app.useGlobalInterceptors(ResponseInterceptor, LoggingInterceptor)
7. SwaggerModule.setup('api/docs', app, document)
8. app.listen(process.env.PORT ?? 4000)
```

### Redis Usage
| Key Pattern | Purpose | TTL |
|---|---|---|
| `blacklist:token:<jti>` | Logout token blacklist | Remaining token lifetime |
| `roles:perms:<roleId>` | Role permissions cache | 10 min |
| `site_config:<key>` | Site configuration cache | 5 min |
| `flash_sale:slots:<itemId>` | Flash sale slot counter | Until sale ends |

### BullMQ Queues
| Queue | Processor | Trigger |
|---|---|---|
| `email` | `email.processor.ts` | Register, order confirm, invite employee |
| `notification` | `notification.processor.ts` | Order events, low stock, new ticket |
| `report` | `report.processor.ts` | Nightly cron 02:00 UTC |
| `inventory-alert` | `inventory-alert.processor.ts` | Cron every 1 hour |

---

## Docker Compose (Production)

```yaml
version: '3.8'
services:
  backend:
    build: .
    ports: ['4000:4000']
    env_file: .env
    depends_on: [mysql, redis]
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
    volumes: ['mysql_data:/var/lib/mysql']
    ports: ['3306:3306']

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    volumes: ['redis_data:/data']

volumes:
  mysql_data:
  redis_data:
```

---

## Environment Variables (.env)

```bash
NODE_ENV=development
PORT=4000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=secret
DB_NAME=computer_store

# JWT
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=30d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# File Upload
UPLOAD_DEST=./uploads
MAX_FILE_SIZE=10485760

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Payment Gateways
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
VNPAY_URL=
MOMO_PARTNER_CODE=
MOMO_ACCESS_KEY=
MOMO_SECRET_KEY=

# Email (SMTP or SendGrid)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Frontend URLs (for CORS + redirect)
CLIENT_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001
```

---

## API Response Shape

All responses wrapped by `ResponseInterceptor`:

```json
// Success (2xx)
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 150 }
}

// Error (4xx / 5xx) — from GlobalExceptionFilter
{
  "success": false,
  "statusCode": 404,
  "message": "Product not found",
  "errors": []
}
```

---

## Database Indexes (Critical)

Add these indexes beyond PKs/FKs for query performance:

```sql
-- Products full-text search
ALTER TABLE san_pham ADD FULLTEXT INDEX idx_ft_product_name (ten_san_pham, mo_ta_ngan);

-- Order lookup
CREATE INDEX idx_order_customer ON don_hang (khach_hang_id, trang_thai_don);
CREATE INDEX idx_order_status ON don_hang (trang_thai_don, ngay_dat_hang);

-- Stock lookup
CREATE UNIQUE INDEX idx_stock_variant_warehouse ON ton_kho (phien_ban_id, kho_id);

-- Promotions
CREATE INDEX idx_promo_active ON promotions (status, start_date, end_date);

-- Reviews
CREATE INDEX idx_review_variant ON danh_gia_san_pham (phien_ban_id, review_status);

-- Notifications
CREATE INDEX idx_notif_customer ON thong_bao (khach_hang_id, da_doc);

-- Loyalty
CREATE INDEX idx_loyalty_customer ON loyalty_point_transaction (khach_hang_id, ngay_tao);
```
