# computer-store-backend

NestJS REST API backend for **Online PC Store System** — a retail platform for computers and peripherals.

> AI agent documentation is in the `.ai/` folder. Read `CLAUDE.md` first before writing any code.

## Tech Stack

- **NestJS 11.0.14** · **TypeScript 6.0.3** · **TypeORM 0.3** · **MySQL 8**
- **Redis 7** (cache + BullMQ queues) · **Passport JWT** · **Swagger**
- Port: **4000** | Docs: **`/api/docs`**

## Quick Start

```bash
npm install
cp .env.example .env   # fill in DB, JWT, Redis, Cloudinary, payment keys
npm run start:dev
```

## Commands

```bash
npm run start:dev       # Development with hot reload
npm run build           # Compile TypeScript
npm run test            # Unit tests
npm run test:e2e        # End-to-end tests
npm run test:cov        # Coverage report

# TypeORM migrations
npx typeorm migration:generate src/database/migrations/Init -d ormconfig.ts
npx typeorm migration:run -d ormconfig.ts
```

## AI Agent Guidance (`.ai/`)

| File | Purpose | When to Read |
|---|---|---|
| `CLAUDE.md` | Master guide: tech stack, naming rules, build phases, key rules | **Always — read first** |
| `.ai/DATABASE.md` | Full mapping: Vietnamese ERD tables → English entity class + properties | When creating/editing any entity |
| `.ai/MODULES.md` | All 27 modules: DB tables, endpoints, business logic summary | When working on any module |
| `.ai/ARCHITECTURE.md` | Folder structure, Redis usage, BullMQ queues, Docker, indexes | When setting up infrastructure or adding a new module |
| `.ai/CONVENTIONS.md` | Code patterns for DTOs, entities, services, controllers, errors | When writing any source file |
| `.ai/BUSINESS-RULES.md` | Critical business logic: checkout flow, stock, loyalty, promotions | When implementing order/payment/stock logic |

## 3 Rules Always Apply

1. **All code in English** — variable names, method names, DTO properties, file names
2. **DB columns stay Vietnamese** — `@Column({ name: 'ten_san_pham' })` as defined in ERD
3. **No file > 500 lines** — split into sub-services or separate controllers

## Build Order

```
Phase 0 → Foundation (TypeORM, ConfigModule, Swagger, Guards)
Phase 1 → Auth + Users + Employees + Roles
Phase 2 → Categories + Brands + Specs + Products + Media + BuildPC
Phase 3 → Cart + Orders + Payments (VNPay/MoMo/COD)
Phase 4 → Inventory + Suppliers
Phase 5 → Promotions + Flash Sales + Loyalty
Phase 6 → Reviews + Returns + Support Tickets
Phase 7 → Notifications + Wishlist + Search
Phase 8 → CMS (banners, pages, FAQ, menus)
Phase 9 → Reports + Settings
Phase 10 → Tests + Docker + PM2 + Nginx
```

## Module Structure (mandatory for every module)

```
src/modules/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts       # public routes
├── admin-<feature>.controller.ts # admin routes
├── <feature>.service.ts
├── dto/  (create, update, query, response — one file each)
└── entities/  (one file per entity)
```

## Docker

```bash
docker compose up -d
# NestJS :4000 + MySQL :3306 + Redis :6379
```
