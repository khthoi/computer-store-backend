# BUSINESS-RULES.md — Critical Business Logic Reference

## Checkout Flow (Complete)

```
1.  Validate cart: each CartItem → StockLevel.quantity > 0
2.  Price each item: ProductVariant.salePrice
3.  Apply Flash Sale: check flash_sale_item.so_luong_gioi_han - so_luong_da_ban > 0
                      use gia_flash instead of salePrice if active
4.  Evaluate Promotions: PromotionsService.evaluate(cart, customerId)
        a. Fetch promotions WHERE status='active' AND start_date ≤ NOW ≤ end_date
        b. Filter by scope (global / category / product / variant / brand)
        c. Check conditions (min_order_value, total_usage_limit, per_customer_limit)
        d. Apply actions (percentage_discount / fixed_discount / free_shipping / bxgy / bulk)
        e. Respect stacking_policy (exclusive = only highest; stackable = combine all)
5.  Apply Loyalty redemption coupon (if customer chose to redeem points)
6.  Create Order (status = 'ChoTT')
7.  Create OrderItems with snapshots (ten_san_pham_snapshot, SKU_snapshot, gia_tai_thoi_diem)
8.  Reserve stock: StockLevel.quantity -= quantity  (within DB transaction)
9.  Create Transaction (status = 'Cho')
10. Return payment URL (VNPay/MoMo) or COD confirmation
11. [Async] Payment webhook → verify signature → update Transaction (ThanhCong/ThatBai)
12. On success: Order.status = 'DaXacNhan' → notify admin via SSE → send email to customer
13. Earn loyalty points: AFTER order → 'DaGiao', not at checkout
14. On failure: restore reserved stock; Order.status = 'DaHuy'
```

## Order Status Transitions

```
ChoTT (pending)
  ↓ payment confirmed
DaXacNhan (confirmed)
  ↓ staff packs
DongGoi (packing)
  ↓ handed to carrier
DangGiao (shipping)
  ↓ customer received
DaGiao (delivered)       → trigger loyalty points earn
  ↓ customer requests
HoanTra (returned)       → trigger stock restore + refund

ChoTT → DaHuy            customer cancel only from pending
DaXacNhan → DaHuy        admin cancel only (with reason)
```

## Stock Management

| Event | Action |
|---|---|
| Checkout (payment initiated) | `StockLevel.quantity -= qty` (immediate reserve — no separate reserved column) |
| Payment failed / order cancelled | `StockLevel.quantity += qty` (restore) |
| Return approved (`HoanTien` or `GiaoHangMoi`) | `StockLevel.quantity += qty` (restore) |
| Import receipt approved | `StockLevel.quantity += so_luong_thuc_nhap` |
| Manual adjustment | `StockLevel.quantity = new_value`, write `StockHistory (loai='adjustment')` |

**Always write `StockHistory` (table: `lich_su_nhap_xuat`) for every change.**

## Loyalty Points

- Points are earned when `Order.status` transitions to `'DaGiao'` (delivered)
- `Customer.loyaltyPoints` is a **denormalized cache** — must be updated in the **same DB transaction** as inserting `LoyaltyTransaction`
- Authoritative source: `SUM(diem) FROM loyalty_point_transaction WHERE khach_hang_id = ?`
- `earn_rule_scope.multiplier` applies on top of base `points_per_unit / spend_per_unit` ratio
- Points deducted on return/order cancel: insert negative `LoyaltyTransaction` (type='redeem' with negative points)

## Promotion Rules

- `is_coupon = TRUE`: customer must enter code → `PromotionService.applyCode(code)`
- `is_coupon = FALSE`: auto-evaluated at checkout, sorted by `priority DESC`
- `stacking_policy`:
  - `exclusive`: apply only the single best promotion
  - `stackable`: apply all qualifying promotions
  - `stackable_with_coupons_only`: auto-apply promotions stack with coupon, not with each other
- Track usage: insert `PromotionUsage` after successful checkout (not during evaluation)
- `usage_count` incremented atomically to prevent overselling

## Flash Sale Concurrency

Flash sale item quantities must be decremented atomically:
```typescript
// Use optimistic locking or atomic decrement
await manager
  .createQueryBuilder()
  .update(FlashSaleItem)
  .set({ so_luong_da_ban: () => 'so_luong_da_ban + 1' })
  .where('flash_sale_item_id = :id AND so_luong_da_ban < so_luong_gioi_han', { id })
  .execute();
// If affected rows = 0 → sold out
```

## Review Gate

A customer can only review a product variant if:
1. They have an order with `trang_thai_don = 'DaGiao'`
2. That order contains the specific `phien_ban_id`
3. They have not already reviewed that variant for that order

```typescript
const purchase = await this.orderItemRepo.findOne({
  where: {
    order: { customerId, status: 'DaGiao' },
    variantId: dto.variantId,
  },
});
if (!purchase) throw new ForbiddenException('Must purchase product before reviewing');
```

## Soft Delete Rules

| Entity | Blocked when | Action |
|---|---|---|
| `Customer` | Has active orders (`ChoTT`, `DaXacNhan`, `DongGoi`, `DangGiao`) | Throw `ForbiddenException` |
| `Product` | Any variant has active orders | Set `trang_thai = 'NgungBan'` |
| `ProductVariant` | Has active orders | Set `trang_thai = 'An'` |
| `Employee` | Is only admin | Block; set `trang_thai = 'NghiViec'` otherwise |
| `Category` | Has active products | Block; set `trang_thai = 'An'` if no products |

## Notification Triggers

| Event | Notification recipient | Channel |
|---|---|---|
| New order created | Admin (SSE) + Customer (Email) | SSE + email queue |
| Order status changed | Customer | Email |
| Payment failed | Customer | Email |
| Stock below threshold | Admin (SSE) | SSE + notification record |
| New support ticket | Admin (SSE) | SSE |
| Staff replied to ticket | Customer | Email |
| Review approved | Customer | Notification record |
| Loyalty points earned | Customer | Notification record |

## Return Policy

- Return window: configurable via `site_config['return_window_days']` (default: 7)
- Allowed from: `Order.status = 'DaGiao'` only
- `loai_yeu_cau`:
  - `DoiHang` → ship replacement, deduct + re-add stock
  - `TraHang` → refund, restore stock
  - `BaoHanh` → send to repair (no stock change)
- On approval: insert `StockHistory (loai='HoanTra')`, trigger refund via payment gateway

## Admin RBAC — Permission Keys

Permission `maQuyen` format: `{module}.{action}`

```
product.read        product.create      product.update      product.delete
order.read          order.update        order.cancel
inventory.read      inventory.manage    inventory.import
customer.read       customer.update     customer.block
employee.manage     role.manage
promotion.manage    flash_sale.manage   loyalty.manage
review.moderate     return.manage       ticket.manage
report.view         report.export
cms.manage          settings.manage
```

## SEO Slug Generation

Auto-generate slugs when not provided. Ensure uniqueness by appending `-{id}` suffix:

```typescript
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // strip diacritics
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
// If slug exists: append -2, -3, etc.
```
