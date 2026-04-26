# CLAUDE.md — AI Agent Guide: Computer Store Backend

## Project Overview

**Online PC Store System** — NestJS backend for a retail computer & peripheral e-commerce platform.

- Runtime: Node.js ≥ 20 LTS
- Framework: NestJS 11.0.14 · TypeScript 6.0.3
- ORM: TypeORM 0.3.x → MySQL 8.0+
- Cache/Queue: Redis 7.x · BullMQ 5.x
- Auth: Passport.js (JWT + Local strategy)
- Port: **4000**
- API docs: `/api/docs` (Swagger)

## Reading .docx Files
Both `pandoc` (preferred) and `python-docx` are installed. Use a **single Bash call** — never chain multiple commands.

```bash
# PREFERRED — pandoc: renders tables as clean markdown tables (best for DB design docs)
pandoc "path/to/file.docx" -t markdown --wrap=none

# Headings only — use first on large documents to get an outline, then target sections
pandoc "path/to/file.docx" -t markdown --wrap=none | grep "^#"

# Fallback — python-docx: plain text only, tables lose formatting
python -c "
import docx, sys
doc = docx.Document(sys.argv[1])
for p in doc.paragraphs:
    if p.text.strip(): print(p.text)
for t in doc.tables:
    for row in t.rows:
        print(' | '.join(c.text.strip() for c in row.cells if c.text.strip()))
" "path/to/file.docx"
```

## Using Powershell commands is allowed

CLAUDE_CODE_USE_POWERSHELL_TOOL=1

## Architecture

Monolith with modular structure. Three clients:
- **Client frontend** (port 3000) — Next.js customer storefront
- **Admin frontend** (port 3001) — Next.js admin dashboard
- **Mobile** (optional) — React Native

## Mandatory Conventions

### Naming (ALWAYS English in code)

| Context | Rule | Example |
|---|---|---|
| Files | kebab-case | `product-variant.entity.ts` |
| Classes | PascalCase | `ProductVariant` |
| Variables / properties | camelCase | `createdAt`, `categoryId` |
| DB table (TypeORM `@Entity`) | Vietnamese snake_case (from ERD) | `@Entity('san_pham')` |
| DB column (TypeORM `@Column`) | Vietnamese snake_case (from ERD) | `{ name: 'ten_san_pham' }` |
| DTO properties | camelCase English | `name`, `categoryId`, `status` |
| API routes | kebab-case | `/flash-sales`, `/build-pc` |
| Enum values | SCREAMING_SNAKE or lowercase string | `'active'` `'pending'` |

### DB Column Mapping Table (ERD → English Entity Property)

```
khach_hang_id    → id          email            → email
ho_ten           → fullName    mat_khau_hash     → passwordHash
trang_thai       → status      ngay_tao          → createdAt
ngay_cap_nhat    → updatedAt   phien_ban_id      → variantId
san_pham_id      → productId   don_hang_id       → orderId
```

> Always map Vietnamese DB columns to meaningful English property names in entities.

### File Size Limit

**No source file > 300 lines.** Split large services into focused sub-services or helpers:
- `products.service.ts` — CRUD operations
- `products-search.service.ts` — search/filter logic
- `products-stock.service.ts` — stock-related queries

### Module Structure (standard, replicate for every module)

```
src/modules/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts          # public routes
├── admin-<feature>.controller.ts    # admin-only routes
├── <feature>.service.ts
├── dto/
│   ├── create-<feature>.dto.ts
│   ├── update-<feature>.dto.ts
│   ├── query-<feature>.dto.ts
│   └── <feature>-response.dto.ts
└── entities/
    └── <entity>.entity.ts
```

### Code Rules

1. **No raw SQL** — use TypeORM QueryBuilder or repository methods.
2. **Validation at boundary only** — every DTO uses `class-validator` decorators.
3. **GlobalValidationPipe** with `whitelist: true, forbidNonWhitelisted: true, transform: true`.
4. **No comments explaining WHAT** — only WHY (non-obvious constraints, workarounds).
5. **No extra abstractions** — three similar lines is better than a premature helper.
6. **Delete strategy by entity type:**
   - Products / Variants → **hard delete** (order items snapshot price/name at purchase time; frontend guard prevents delete if active orders exist). Before hard-deleting a product: delete its SpecValues first (orphan cleanup). Before hard-deleting a variant: delete its SpecValues + Images first.
   - Customers → **soft delete** (`trang_thai = 'BiKhoa'`) — never hard delete if any order exists.
   - Orders → never delete.
7. **Snapshot fields** — when placing an order, snapshot `ten_san_pham`, `SKU`, `gia_tai_thoi_diem` into order items.
8. **Redis TTL** for permission cache (10 min), site_config cache, token blacklist.

### Security Checklist (apply from day one)

- [ ] `helmet()` middleware in `main.ts`
- [ ] CORS whitelist: `localhost:3000`, `localhost:3001`
- [ ] JWT access token 15 min, refresh token 30 days (HttpOnly cookie)
- [ ] Token blacklist on logout (Redis SET with TTL)
- [ ] Rate limiting: 100 req/min public, 1000 req/min authenticated
- [ ] `@Roles()` + `RolesGuard` on every admin endpoint
- [ ] `@Public()` decorator to explicitly mark public routes

## Build Phases (follow strictly in order)

| Phase | Focus | Duration |
|---|---|---|
| 0 | Foundation: TypeORM, ConfigModule, Swagger, GlobalFilter | ~1 day |
| 1 | Auth + Users + Employees + Roles (JWT, RBAC) | ~2 days |
| 2 | Categories + Brands + Specs + Products + Media + BuildPC | ~3 days |
| 3 | Cart + Orders + Payments (VNPay/MoMo/COD) | ~3 days |
| 4 | Inventory + Suppliers (stock in/out, low-stock BullMQ job) | ~2 days |
| 5 | Promotions + Flash Sales + Loyalty | ~3 days |
| 6 | Reviews + Returns + Support Tickets (SSE) | ~2 days |
| 7 | Notifications (SSE) + Wishlist + Search | ~2 days |
| 8 | CMS (banners, pages, FAQ, menus, popups, site config) | ~2 days |
| 9 | Reports (scheduled snapshots, export) + Settings | ~2 days |
| 10 | Tests + Indexes + Docker + PM2 + Nginx | ~1 day |

> See `.ai/MODULES.md` for detailed module specs and `.ai/DATABASE.md` for full entity mapping.

## Key Business Rules

1. **Checkout flow**: validate cart → price → promotions → flash sale → loyalty → create order (pending) → reserve stock → create transaction → redirect payment → webhook → confirm → deduct stock → earn loyalty points → notify.
2. **Stock**: reserved on checkout, actually deducted on order confirmation. Restore on cancel/return.
3. **Reviews**: only customers who have a delivered order for that variant can submit. Requires approval (pending → approved/hidden/rejected).
4. **Promotions**: support `is_coupon` (manual code) and auto-apply. Stacking policy: `exclusive | stackable | stackable_with_coupons_only`.
5. **Loyalty points**: `diem_hien_tai` on `khach_hang` is a **denormalized cache** — always update it in the same transaction as `loyalty_point_transaction` INSERT.
6. **Soft delete customers**: set `trang_thai = 'BiKhoa'`, never hard delete if active orders exist.

## Reference Files

| File | Purpose |
|---|---|
| `.ai/DATABASE.md` | Full entity name mapping (ERD → English) for all 40+ tables |
| `.ai/MODULES.md` | All 27 modules: DB tables, entities, endpoints, business logic |
| `.ai/ARCHITECTURE.md` | Folder structure, infrastructure, deployment |
| `.ai/CONVENTIONS.md` | Detailed coding standards and patterns (includes Swagger ApiTags rules) |
| `.ai/TESTING.md` | **Testing skills**: cURL (real API calls, CORS, auth/cookies) + MySQL CLI (fake data seeding) |

---

## Documentation Source Files

Primary design documents live at:
```
D:\Online PC Store System\Documentation\System Design\Docs\
```

### When to read each file

| Situation | File to read | Section to target |
|---|---|---|
| Need column names / types for a specific DB table | `Tài liệu đặc tả ERD - Hệ thống bán lẻ máy tính & linh kiện trực tuyến.docx` | **Section 6 onwards** (`# 6. Mô tả Physical ERD`) — skip Sections 1–5 (Context/Conceptual/Logical) |
| Need index strategy for a table | Same ERD doc | Section 7 (`# 7. Đặc tả các khoá chỉ mục`) |
| Need module API prefix, DB tables list, or business rules for a module | `Trình tự xây dựng Backend NestJS.docx` | Sections 5 & 7 (module list + module details) |
| Need build phase order or checklist | Same NestJS doc | Sections 4 & 10 |

### How to read efficiently (large files)

```bash
# Step 1 — get headings outline first
pandoc "D:/Online PC Store System/Documentation/System Design/Docs/<filename>.docx" \
  -t markdown --wrap=none | grep "^#"

# Step 2 — jump to Physical ERD section (skip first 5 sections)
pandoc "D:/Online PC Store System/Documentation/System Design/Docs/Tài liệu đặc tả ERD - Hệ thống bán lẻ máy tính & linh kiện trực tuyến.docx" \
  -t markdown --wrap=none | sed -n '/^# 6\. Mô tả Physical ERD/,$p'

# Step 3 — target a specific table by name
pandoc "..." -t markdown --wrap=none \
  | sed -n '/### Bảng: ten_bang/,/### Bảng:/p' | head -60
```

> **Rule:** Always check `.ai/DATABASE.md` first. Only open the ERD docx when you need columns/types not listed there, or when implementing a new entity from scratch.
