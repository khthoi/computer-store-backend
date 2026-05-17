# Computer Store Backend

REST API server for the **Online PC Store System** — a single-vendor e-commerce platform for computers, components, and peripherals. This service powers both the customer storefront and the staff admin dashboard.

## Tech Stack

- **Runtime:** Node.js 20 LTS
- **Framework:** NestJS 11 + TypeScript
- **Database:** MySQL 8 via TypeORM
- **Cache & Queue:** Redis 7 + BullMQ
- **Auth:** Passport.js (JWT access + refresh tokens, RBAC)
- **API Docs:** Swagger UI
- **Media:** Cloudinary
- **Payments:** VNPay, MoMo, Cash on Delivery

## What's Inside

A modular monolith covering the full retail workflow:

### Catalog
- Products, variants, brands, categories (tree), and configurable specifications
- Media library with Cloudinary upload + multi-image gallery per product/variant
- Build-PC configurator with compatibility rules across components

### Sales & Orders
- Shopping cart (guest + authenticated)
- Checkout pipeline: cart validation → pricing → promotions → flash sale → loyalty redemption → order creation → atomic stock deduction → payment redirect → webhook confirmation
- Order lifecycle management (pending → confirmed → packed → shipping → delivered / cancelled / returned)
- Snapshotted line items (name, SKU, price-at-purchase) so historical orders never drift

### Payments
- VNPay and MoMo gateway integration with signed webhooks
- COD flow with manual confirmation
- Transaction log per order

### Inventory & Suppliers
- Stock-in receipts, manual adjustments, low-stock alerts (BullMQ background job)
- Supplier directory linked to purchase records

### Promotions & Loyalty
- Discount rules: percentage / fixed / free-shipping
- Manual coupons (`is_coupon`) and auto-apply rules
- Stacking policy: `exclusive | stackable | stackable_with_coupons_only`
- Flash sale slots with countdown and per-variant stock caps
- Loyalty point earning rules + redemption, denormalized point balance kept in sync via transactional ledger

### Customer Experience
- Reviews (post-delivery only, moderation queue)
- Returns / refund requests
- Wishlist
- Support tickets with SSE-based real-time replies
- Notifications via Server-Sent Events

### Content Management
- Banners, homepage modules, FAQ, navigation menus, popups, site-wide settings
- Static pages with rich-text content

### Operations
- Reports with scheduled snapshots and CSV/Excel export
- Audit logging for sensitive admin actions
- Role-based access control with cached permission lookups

## Authentication

- Customer login: `POST /api/auth/login`
- Admin login: `POST /api/auth/admin/login`
- Access token: JWT, 15 minute TTL, sent as `Authorization: Bearer <token>`
- Refresh token: 30 day TTL, HttpOnly cookie
- Logout invalidates the access token via a Redis blacklist

## API Response Shape

Every successful response is wrapped by the global response interceptor:

```json
{
  "statusCode": 200,
  "message": "success",
  "data": { ... },
  "timestamp": "2026-05-17T10:00:00.000Z"
}
```

List endpoints return `{ data, total, page, limit, totalPages }` inside `data`. Errors return `{ statusCode, message, error }`.

## Getting Started

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Fill in: DB credentials, JWT secrets, Redis URL, Cloudinary keys,
#         VNPay/MoMo credentials, mail SMTP, frontend URLs

# Run database migrations
npx typeorm migration:run -d ormconfig.ts

# Start in development (hot reload)
npm run start:dev
```

The server boots on **http://localhost:4000** with API docs at **http://localhost:4000/api/docs**.

## Available Scripts

| Command | Purpose |
|---|---|
| `npm run start:dev` | Development server with hot reload |
| `npm run start:prod` | Production server (after `npm run build`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run lint` | Run ESLint |
| `npm run test` | Unit tests (Jest) |
| `npm run test:e2e` | End-to-end tests |
| `npm run test:cov` | Coverage report |

## Docker

A `docker-compose.yml` provisions the full stack:

```bash
docker compose up -d
```

Brings up:
- NestJS API on `:4000`
- MySQL 8 on `:3306`
- Redis 7 on `:6379`

## Security

- `helmet()` HTTP headers
- CORS whitelist for the storefront (`:3000`) and admin (`:3001`)
- Global validation pipe with whitelisting and DTO transformation
- Rate limiting: 100 req/min for public routes, 1000 req/min for authenticated
- All admin routes guarded by `@Roles()` + `RolesGuard`
- Token blacklist on logout with Redis TTL

## License

Proprietary — internal project.
