# MODULES.md — All 27 Modules Specification

Each module follows the standard structure defined in `CLAUDE.md`. This file provides the DB tables, entity classes, API prefix, endpoints, and key business logic for every module.

---

## Module 01 — Auth

**Path:** `src/modules/auth/`
**DB Tables:** `khach_hang`, `nhan_vien`
**Entities:** `Customer`, `Employee`
**API Prefix:** `/auth`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Customer registration |
| POST | `/auth/login` | Public | Customer login → JWT |
| POST | `/auth/admin/login` | Public | Employee login → JWT |
| POST | `/auth/refresh` | Public (refresh token) | Rotate access token |
| POST | `/auth/logout` | JWT required | Blacklist token in Redis |

### Business Logic
- Separate Passport strategies: `LocalCustomerStrategy`, `LocalEmployeeStrategy`, `JwtStrategy`
- `bcryptjs` hash on register
- accessToken TTL: 15 min; refreshToken TTL: 30 days (HttpOnly cookie)
- Logout: store token in Redis blacklist with TTL matching remaining token lifetime
- `JwtAuthGuard` checks blacklist on every request

---

## Module 02 — Users (Customers)

**Path:** `src/modules/users/`
**DB Tables:** `khach_hang`, `dia_chi_giao_hang`
**Entities:** `Customer`, `ShippingAddress`
**API Prefix:** `/users`, `/admin/customers`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | Customer JWT | Get own profile |
| PUT | `/users/me` | Customer JWT | Update profile |
| GET | `/users/me/addresses` | Customer JWT | List shipping addresses |
| POST | `/users/me/addresses` | Customer JWT | Add address |
| PUT | `/users/me/addresses/:id` | Customer JWT | Update address |
| DELETE | `/users/me/addresses/:id` | Customer JWT | Delete address |
| GET | `/admin/customers` | Admin | List all customers (paginated) |
| GET | `/admin/customers/:id` | Admin | Customer detail |
| PUT | `/admin/customers/:id` | Admin | Update customer |
| DELETE | `/admin/customers/:id` | Admin | Soft delete (set status=BiKhoa) |

### Business Logic
- Soft delete only: set `status = 'BiKhoa'`; block if customer has active orders
- Default address: only one `la_mac_dinh = true` per customer

---

## Module 03 — Employees

**Path:** `src/modules/employees/`
**DB Tables:** `nhan_vien`, `nhan_vien_vai_tro`
**Entities:** `Employee`, `EmployeeRole`
**API Prefix:** `/admin/employees`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/admin/employees` | Admin | List employees |
| POST | `/admin/employees` | Admin | Create employee (send invite email) |
| GET | `/admin/employees/:id` | Admin | Employee detail |
| PUT | `/admin/employees/:id` | Admin | Update employee |
| DELETE | `/admin/employees/:id` | Admin | Soft delete |
| PUT | `/admin/employees/:id/roles` | Admin | Assign roles |

### Business Logic
- On create: generate temporary password → send email via BullMQ `email.processor`
- One employee can have multiple roles via `nhan_vien_vai_tro`

---

## Module 04 — Roles & Permissions

**Path:** `src/modules/roles/`
**DB Tables:** `vai_tro`, `quyen`, `vai_tro_quyen`
**Entities:** `Role`, `Permission`, `RolePermission`
**API Prefix:** `/admin/roles`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/admin/roles` | Admin | List roles |
| POST | `/admin/roles` | Admin | Create role |
| PUT | `/admin/roles/:id` | Admin | Update role (add/remove permissions) |
| DELETE | `/admin/roles/:id` | Admin | Delete role |
| GET | `/admin/permissions` | Admin | List all permissions |

### Business Logic
- Cache permission list per role in Redis (TTL 10 min)
- Invalidate cache on role update
- `RolesGuard` reads `@Roles('permission.key')` decorator, checks JWT payload

---

## Module 05 — Categories

**Path:** `src/modules/categories/`
**DB Tables:** `danh_muc`
**Entities:** `Category` (self-referencing tree)
**API Prefix:** `/categories`, `/admin/categories`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/categories` | Public | Get full category tree |
| GET | `/categories/:slug` | Public | Category by slug |
| POST | `/admin/categories` | Admin | Create category |
| PUT | `/admin/categories/:id` | Admin | Update category |
| DELETE | `/admin/categories/:id` | Admin | Delete (blocked if has products) |

### Business Logic
- Self-referencing: `danh_muc_cha_id` FK → self
- Auto-generate slug from name (unique)
- Sort by `thu_tu_hien_thi`
- `node_type`: `'category'` (real), `'filter'` (virtual filter link), `'label'` (display only)

---

## Module 06 — Brands

**Path:** `src/modules/brands/`
**DB Tables:** `thuong_hieu`, `san_pham_thuong_hieu`
**Entities:** `Brand`, `ProductBrand`
**API Prefix:** `/brands`, `/admin/brands`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/brands` | Public | List active brands |
| POST | `/admin/brands` | Admin | Create brand |
| PUT | `/admin/brands/:id` | Admin | Update brand |
| DELETE | `/admin/brands/:id` | Admin | Delete brand |

### Business Logic
- N:N with products via `san_pham_thuong_hieu` junction table
- A product can have multiple brands (e.g., MSI laptop → MSI + Intel + NVIDIA)

---

## Module 07 — Products

**Path:** `src/modules/products/`
**DB Tables:** `san_pham`, `phien_ban_san_pham`, `hinh_anh_san_pham`
**Entities:** `Product`, `ProductVariant`, `ProductImage`
**API Prefix:** `/products`, `/admin/products`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/products` | Public | List products (filter/sort/paginate) |
| GET | `/products/:slug` | Public | Product detail with variants |
| POST | `/admin/products` | Admin | Create product |
| PUT | `/admin/products/:id` | Admin | Update product |
| DELETE | `/admin/products/:id` | Admin | Soft delete |
| POST | `/admin/products/:id/variants` | Admin | Add variant |
| PUT | `/admin/products/:id/variants/:variantId` | Admin | Update variant |

### Business Logic
- Each product has ≥1 variants (`phien_ban_san_pham`); price/SKU live on variant
- Soft delete: set `trang_thai = 'NgungBan'`; blocked if variant has active orders
- `avgRating` and `reviewCount` updated after each approved review

---

## Module 08 — Specifications

**Path:** `src/modules/specifications/`
**DB Tables:** `nhom_thong_so`, `loai_thong_so`, `danh_muc_nhom_thong_so`, `gia_tri_thong_so`
**Entities:** `SpecGroup`, `SpecType`, `CategorySpecGroup`, `SpecValue`
**API Prefix:** `/specs`, `/admin/specs`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/specs/groups` | Public | List spec groups |
| GET | `/specs/types` | Public | List spec types |
| GET | `/products/:id/specs` | Public | Get product variant specs |
| POST | `/admin/specs/groups` | Admin | Create spec group |
| POST | `/admin/specs/types` | Admin | Create spec type |
| PUT | `/admin/products/:id/variants/:variantId/specs` | Admin | Save spec values |

### Business Logic
- `loai_thong_so.ma_ky_thuat` is machine-readable key for compatibility engine (e.g., `cpu_socket`, `ram_type`)
- `gia_tri_thong_so` has both `giaTriThongSo` (display) and `gia_tri_so` (numeric for range filter)
- `danh_muc_nhom_thong_so` links categories to spec groups with filter visibility config

---

## Module 09 — BuildPC

**Path:** `src/modules/build-pc/`
**DB Tables:** `buildpc_slot_dinh_nghia`, `buildpc_quy_tac_tuong_thich`, `buildpc_da_luu`, `buildpc_chi_tiet`
**Entities:** `BuildSlot`, `CompatibilityRule`, `SavedBuild`, `BuildDetail`
**API Prefix:** `/build-pc`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/build-pc/slots` | Public | Get all component slots (CPU, RAM, etc.) |
| POST | `/build-pc/check-compatibility` | Public | Check compatibility for selected variants |
| GET | `/build-pc/saved` | Customer JWT | List my saved builds |
| POST | `/build-pc/saved` | Customer JWT | Save a build |
| GET | `/build-pc/saved/:id` | Public | Get public build by ID |
| DELETE | `/build-pc/saved/:id` | Customer JWT | Delete own build |

### Business Logic
- Compatibility check: match `ma_ky_thuat` values across slots using `loai_kiem_tra` (exact_match, contains, min_sum, min_value)
- `he_so` multiplier for TDP calculations

---

## Module 10 — Media

**Path:** `src/modules/media/`
**DB Tables:** `media_asset`
**Entities:** `MediaAsset`
**API Prefix:** `/admin/media`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/admin/media/upload` | Admin | Upload file (multipart) |
| GET | `/admin/media` | Admin | List media assets |
| DELETE | `/admin/media/:id` | Admin | Delete asset |

### Business Logic
- Multer handles multipart upload
- Primary storage: Cloudinary (stores `cloudinary_id`, `cloudinary_ver`, `url_goc`)
- Fallback: local `./uploads/` (dev only)
- Track `so_lan_su_dung` — prevent delete if in use

---

## Module 11 — Cart

**Path:** `src/modules/cart/`
**DB Tables:** `gio_hang`, `chi_tiet_gio_hang`
**Entities:** `Cart`, `CartItem`
**API Prefix:** `/cart`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/cart` | Customer JWT | Get current cart |
| POST | `/cart/items` | Customer JWT | Add item to cart |
| PUT | `/cart/items/:id` | Customer JWT | Update quantity |
| DELETE | `/cart/items/:id` | Customer JWT | Remove item |
| DELETE | `/cart` | Customer JWT | Clear cart |

### Business Logic
- One cart per customer (UNIQUE on `khach_hang_id`)
- Check stock before adding (`StockLevel.quantity > 0`)
- Auto-clear cart after successful checkout
- Guest cart merge on login (client sends guest cart items, server merges)

---

## Module 12 — Orders

**Path:** `src/modules/orders/`
**DB Tables:** `don_hang`, `chi_tiet_don_hang`, `lich_su_trang_thai_don`
**Entities:** `Order`, `OrderItem`, `OrderStatusHistory`
**API Prefix:** `/orders`, `/admin/orders`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/orders/checkout` | Customer JWT | Place order (full checkout flow) |
| GET | `/orders` | Customer JWT | My orders list |
| GET | `/orders/:id` | Customer JWT | Order detail |
| GET | `/admin/orders` | Admin | All orders (filter/paginate) |
| PUT | `/admin/orders/:id/status` | Admin | Update order status |
| DELETE | `/orders/:id` | Customer JWT | Cancel order (pending only) |

### Status Flow
```
ChoTT → DaXacNhan → DongGoi → DangGiao → DaGiao
                                        ↘ HoanTra
ChoTT → DaHuy (cancel by customer, pending only)
```

### Business Logic
- Checkout atomically: validate → price → promotions → flash sale → create order → reserve stock → create transaction
- `OrderItem` snapshots: `ten_san_pham_snapshot`, `SKU_snapshot`
- Every status change records a row in `lich_su_trang_thai_don`

---

## Module 13 — Payments

**Path:** `src/modules/payments/`
**DB Tables:** `giao_dich`
**Entities:** `Transaction`
**API Prefix:** `/payments`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/payments/create` | Customer JWT | Create payment intent |
| GET | `/payments/vnpay/return` | Public (webhook) | VNPay callback |
| GET | `/payments/momo/callback` | Public (webhook) | MoMo callback |

### Business Logic
- On webhook success: update `Transaction.status = 'ThanhCong'` → update `Order.status = 'DaXacNhan'` → deduct stock (atomic transaction)
- `ma_giao_dich_ngoai` stores external payment gateway transaction ID

---

## Module 14 — Inventory

**Path:** `src/modules/inventory/`
**DB Tables:** `kho_hang`, `ton_kho`, `lich_su_nhap_xuat`, `phieu_nhap_kho`, `chi_tiet_phieu_nhap`
**Entities:** `Warehouse`, `StockLevel`, `StockHistory`, `ImportReceipt`, `ImportReceiptItem`
**API Prefix:** `/admin/inventory`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/admin/inventory` | Admin | Stock levels list |
| GET | `/admin/inventory/:variantId/history` | Admin | Stock history for variant |
| POST | `/admin/inventory/adjust` | Admin | Manual adjustment |
| POST | `/admin/inventory/import` | Admin | Create import receipt |
| PUT | `/admin/inventory/import/:id/approve` | Admin | Approve import → update stock |

### Business Logic
- Import: `phieu_nhap_kho` (ChoDuyet) → approve → update `ton_kho.so_luong_ton` → write `lich_su_nhap_xuat`
- Export: auto on order confirm → write `lich_su_nhap_xuat` with `loai='Xuat'`
- BullMQ job every 1h: scan `ton_kho.so_luong_ton < nguong_canh_bao` → create `Notification`

---

## Module 15 — Suppliers

**Path:** `src/modules/suppliers/`
**DB Tables:** `nha_cung_cap`
**Entities:** `Supplier`
**API Prefix:** `/admin/suppliers`

### Endpoints
Standard CRUD: `GET/POST/PUT/DELETE /admin/suppliers`

---

## Module 16 — Promotions

**Path:** `src/modules/promotions/`
**DB Tables:** `promotions`, `promotion_scope`, `promotion_condition`, `promotion_action`, `promotion_usage`, `promotion_action_bulk_tier`, `promotion_action_bulk_component`
**Entities:** `Promotion`, `PromotionScope`, `PromotionCondition`, `PromotionAction`, `PromotionUsage`, `BulkTier`, `BulkComponent`
**API Prefix:** `/promotions`, `/admin/promotions`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/promotions/active` | Public | List currently active promotions |
| POST | `/promotions/apply` | Customer JWT | Apply coupon code at checkout |
| GET | `/admin/promotions` | Admin | List all promotions |
| POST | `/admin/promotions` | Admin | Create promotion |
| PUT | `/admin/promotions/:id` | Admin | Update promotion |
| DELETE | `/admin/promotions/:id` | Admin | Cancel/delete promotion |

### Evaluation Order (at checkout)
1. Fetch all `status='active'` promotions with `start_date ≤ now ≤ end_date`
2. Filter by `scope_type` (global / category / product / variant / brand)
3. Check `promotion_condition` (min_order_value, max_uses, user_usage_limit, payment_method, etc.)
4. Apply `promotion_action` (percentage_discount / fixed_discount / free_shipping / bxgy / bulk)
5. Apply bulk tiers if type=bulk
6. Post-order: write `promotion_usage` record

---

## Module 17 — Flash Sales

**Path:** `src/modules/flash-sales/`
**DB Tables:** `flash_sale`, `flash_sale_item`
**Entities:** `FlashSale`, `FlashSaleItem`
**API Prefix:** `/flash-sales`, `/admin/flash-sales`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/flash-sales/active` | Public | Currently active flash sale |
| GET | `/flash-sales/:id` | Public | Flash sale detail with items |
| POST | `/admin/flash-sales` | Admin | Create flash sale |
| PUT | `/admin/flash-sales/:id` | Admin | Update flash sale |
| DELETE | `/admin/flash-sales/:id` | Admin | Cancel flash sale |

### Business Logic
- BullMQ Scheduler auto-start/end based on `bat_dau` / `ket_thuc`
- Each item has `so_luong_gioi_han` and `so_luong_da_ban` — atomic decrement on purchase
- UNIQUE(`flash_sale_id`, `phien_ban_id`) — one variant appears once per event

---

## Module 18 — Loyalty

**Path:** `src/modules/loyalty/`
**DB Tables:** `loyalty_earn_rules`, `loyalty_earn_rule_scope`, `loyalty_point_transaction`, `loyalty_redemption_catalog`, `loyalty_redemption`
**Entities:** `LoyaltyEarnRule`, `LoyaltyEarnRuleScope`, `LoyaltyTransaction`, `RedemptionCatalog`, `LoyaltyRedemption`
**API Prefix:** `/loyalty`, `/admin/loyalty`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/loyalty/points` | Customer JWT | Current point balance |
| GET | `/loyalty/transactions` | Customer JWT | Point transaction history |
| GET | `/loyalty/catalog` | Customer JWT | Redemption catalog |
| POST | `/loyalty/redeem` | Customer JWT | Redeem points for coupon |
| GET | `/admin/loyalty/rules` | Admin | List earn rules |
| POST | `/admin/loyalty/rules` | Admin | Create earn rule |

### Business Logic
- **Important**: `khach_hang.diem_hien_tai` is a denormalized cache. Always update it atomically in the same DB transaction as inserting into `loyalty_point_transaction`
- Earn points when order status → `'DaGiao'` (not at checkout)
- Deduct points on return/cancel
- `earn_rule_scope.multiplier` applies category/brand/product bonus multiplier

---

## Module 19 — Reviews

**Path:** `src/modules/reviews/`
**DB Tables:** `danh_gia_san_pham`, `danh_gia_message`
**Entities:** `ProductReview`, `ReviewMessage`
**API Prefix:** `/reviews`, `/admin/reviews`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/products/:id/reviews` | Public | Approved reviews for product |
| POST | `/reviews` | Customer JWT | Submit review |
| PUT | `/admin/reviews/:id/approve` | Admin | Approve review |
| PUT | `/admin/reviews/:id/hide` | Admin | Hide review |
| POST | `/admin/reviews/:id/reply` | Admin | Staff reply |

### Business Logic
- Gate: customer must have `don_hang.trang_thai = 'DaGiao'` for variant being reviewed
- `review_status` flow: `Pending → Approved / Rejected / Hidden`
- After approval: update `san_pham.diem_danh_gia_tb` and `so_luot_danh_gia`
- `da_phan_hoi` flag on review — avoids join to `danh_gia_message` for badge display

---

## Module 20 — Returns

**Path:** `src/modules/returns/`
**DB Tables:** `yeu_cau_doi_tra`, `yeu_cau_doi_tra_asset`
**Entities:** `ReturnRequest`, `ReturnAsset`
**API Prefix:** `/returns`, `/admin/returns`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/returns` | Customer JWT | Submit return request |
| GET | `/returns` | Customer JWT | My return requests |
| GET | `/admin/returns` | Admin | All return requests |
| PUT | `/admin/returns/:id/status` | Admin | Process return |

### Business Logic
- Only allow within N days after delivery (configurable via `site_config`)
- `loai_yeu_cau`: `'DoiHang'|'TraHang'|'BaoHanh'`
- On approval with `huong_xu_ly = 'HoanTien'`: trigger refund + restore stock

---

## Module 21 — Support Tickets

**Path:** `src/modules/support/`
**DB Tables:** `ticket_khieu_nai`, `ticket_message`, `ticket_attachment`
**Entities:** `SupportTicket`, `TicketMessage`, `TicketAttachment`
**API Prefix:** `/support`, `/admin/tickets`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/support/tickets` | Customer JWT | Open ticket |
| GET | `/support/tickets` | Customer JWT | My tickets |
| GET | `/admin/tickets` | Admin | All tickets |
| PUT | `/admin/tickets/:id/assign` | Admin | Assign to employee |
| POST | `/admin/tickets/:id/messages` | Admin | Send reply |
| GET | `/admin/tickets/:id/stream` | Admin (SSE) | Real-time message stream |

### Business Logic
- SSE stream for real-time chat per ticket
- `first_response_at` set on first staff reply — used for SLA tracking
- `sla_deadline` = created_at + priority SLA time (from site_config)
- Warn when ticket open > 24h (BullMQ job)

---

## Module 22 — Notifications

**Path:** `src/modules/notifications/`
**DB Tables:** `thong_bao`, `thong_bao_tu_dong_cau_hinh`
**Entities:** `Notification`, `AutoNotificationConfig`
**API Prefix:** `/notifications`, `/admin/notifications`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | Customer JWT | My notifications |
| PUT | `/notifications/:id/read` | Customer JWT | Mark as read |
| PUT | `/notifications/read-all` | Customer JWT | Mark all read |
| GET | `/admin/notifications/stream` | Admin (SSE) | Admin real-time stream |

### Business Logic
- SSE endpoint pushes to admin dashboard: new orders, low stock alerts, new tickets
- `thong_bao_tu_dong_cau_hinh.trigger_key` maps to events (e.g., `'don_hang.xac_nhan'`)
- Template supports `{{variables}}` substitution

---

## Module 23 — Wishlist

**Path:** `src/modules/wishlist/`
**DB Tables:** `whislist`, `whislist_item` (note: typo preserved from ERD)
**Entities:** `Wishlist`, `WishlistItem`
**API Prefix:** `/wishlist`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/wishlist` | Customer JWT | Get wishlist with stock status |
| POST | `/wishlist/items` | Customer JWT | Add product variant |
| DELETE | `/wishlist/items/:variantId` | Customer JWT | Remove item |

---

## Module 24 — Search

**Path:** `src/modules/search/`
**DB Tables:** `product_view_history`
**Entities:** `ProductViewHistory`
**API Prefix:** `/search`

### Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/search` | Public | Full-text product search |
| GET | `/search/suggestions` | Public | Autocomplete suggestions |
| GET | `/search/history` | Customer JWT | My recently viewed |

### Query Params: `q`, `category`, `brand`, `minPrice`, `maxPrice`, `specs[]`, `sort`, `page`, `limit`

### Business Logic
- FULLTEXT index on `san_pham.ten_san_pham` and `mo_ta_ngan`
- Record view in `product_view_history` for authenticated users
- Filter by spec values using `gia_tri_thong_so.gia_tri_so` for range queries

---

## Module 25 — CMS

**Path:** `src/modules/cms/`
**DB Tables:** `banner_noi_dung`, `homepage_section`, `homepage_section_item`, `trang_noi_dung`, `faq_nhom`, `faq_item`, `menu`, `menu_item`, `popup_thong_bao`, `site_config`
**API Prefix:** `/cms`, `/admin/cms`

### Endpoints (public)

| Route | Description |
|---|---|
| `GET /cms/banners` | Active banners by position |
| `GET /cms/homepage` | Homepage sections with items |
| `GET /cms/pages/:slug` | Static page content |
| `GET /cms/faq` | FAQ groups and items |
| `GET /cms/menu/:position` | Navigation menu |
| `GET /cms/popups` | Active popups |

All admin CRUD: `POST/PUT/DELETE /admin/cms/*`

### Business Logic
- `site_config` is a key-value singleton table; cache in Redis on read
- `homepage_section.sourceConfig` JSON drives dynamic content loading (by category/brand/etc.)

---

## Module 26 — Reports

**Path:** `src/modules/reports/`
**DB Tables:** `report_daily_revenue`, `report_rfm_snapshot`, `report_retention_cohort`, `report_inventory_health`, `report_job_log`
**API Prefix:** `/admin/reports`

### Endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/admin/reports/revenue` | Daily revenue chart data |
| GET | `/admin/reports/top-products` | Best-selling products |
| GET | `/admin/reports/customers` | RFM customer segments |
| GET | `/admin/reports/inventory-value` | Inventory health |
| GET | `/admin/reports/export` | Export Excel/PDF |

### Business Logic
- Nightly BullMQ cron (`report.processor.ts`) populates snapshot tables
- RFM segments: Champions, Loyal, At Risk, Lost, New, etc.
- `report_job_log` tracks job run status for debugging

---

## Module 27 — Settings

**Path:** `src/modules/settings/`
**DB Tables:** `site_config`
**Entities:** `SiteConfig`
**API Prefix:** `/admin/settings`

### Endpoints

| Route | Description |
|---|---|
| `GET/PUT /admin/settings/general` | Site name, logo, contact info |
| `GET/PUT /admin/settings/payments` | Payment gateway keys |
| `GET/PUT /admin/settings/shipping` | Shipping methods, fees |
| `GET/PUT /admin/settings/notifications` | Email/SMS templates |
| `GET/PUT /admin/settings/tax` | Tax rates |

### Business Logic
- Singleton key-value store: `config_key` is PK
- Always cache in Redis; invalidate cache on `PUT`
