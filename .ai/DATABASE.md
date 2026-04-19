# DATABASE.md — Physical ERD Entity Mapping

All DB tables use Vietnamese snake_case names (as defined in ERD). TypeORM entity classes use English PascalCase. Properties use English camelCase mapped to Vietnamese column names via `{ name: '...' }`.

## Naming Convention Recap

```typescript
@Entity('san_pham')
export class Product {
  @PrimaryGeneratedColumn({ name: 'san_pham_id' })
  id: number;

  @Column({ name: 'ten_san_pham', length: 500 })
  name: string;
}
```

---

## Entity Map: DB Table → Class → Properties

### Auth / Users / Employees

| DB Table | Entity Class | File |
|---|---|---|
| `khach_hang` | `Customer` | `users/entities/customer.entity.ts` |
| `nhan_vien` | `Employee` | `employees/entities/employee.entity.ts` |
| `vai_tro` | `Role` | `roles/entities/role.entity.ts` |
| `quyen` | `Permission` | `roles/entities/permission.entity.ts` |
| `vai_tro_quyen` | `RolePermission` | `roles/entities/role-permission.entity.ts` |
| `nhan_vien_vai_tro` | `EmployeeRole` | `employees/entities/employee-role.entity.ts` |
| `dia_chi_giao_hang` | `ShippingAddress` | `users/entities/shipping-address.entity.ts` |

#### `khach_hang` → `Customer`

| DB Column | Property | Type |
|---|---|---|
| `khach_hang_id` | `id` | `number` PK |
| `email` | `email` | `string` UNIQUE |
| `so_dien_thoai` | `phone` | `string` nullable |
| `ho_ten` | `fullName` | `string` |
| `mat_khau_hash` | `passwordHash` | `string` |
| `ngay_sinh` | `birthDate` | `Date` nullable |
| `gioi_tinh` | `gender` | `string` nullable (`'Nam'|'Nu'|'Khac'`) |
| `anh_dai_dien` | `avatarUrl` | `string` nullable |
| `trang_thai` | `status` | `string` (`'HoatDong'|'BiKhoa'|'ChoXacMinh'`) |
| `ngay_dang_ky` | `createdAt` | `Date` |
| `ngay_cap_nhat_cuoi` | `updatedAt` | `Date` |
| `xac_minh_email` | `emailVerified` | `boolean` |
| `diem_hien_tai` | `loyaltyPoints` | `number` (denormalized cache) |
| `asset_id_avatar` | `avatarAssetId` | `number` FK → `media_asset` nullable |

#### `nhan_vien` → `Employee`

| DB Column | Property | Type |
|---|---|---|
| `nhan_vien_id` | `id` | `number` PK |
| `maNhanVien` | `employeeCode` | `string` UNIQUE |
| `email` | `email` | `string` UNIQUE |
| `ho_ten` | `fullName` | `string` |
| `gioi_tinh` | `gender` | `string` nullable |
| `mat_khau_hash` | `passwordHash` | `string` |
| `anh_dai_dien` | `avatarUrl` | `string` nullable |
| `trang_thai` | `status` | `string` (`'DangLam'|'NghiViec'`) |
| `ngay_tao` | `createdAt` | `Date` |
| `asset_id_avatar` | `avatarAssetId` | `number` nullable |

---

### Categories / Brands

| DB Table | Entity Class | File |
|---|---|---|
| `danh_muc` | `Category` | `categories/entities/category.entity.ts` |
| `thuong_hieu` | `Brand` | `brands/entities/brand.entity.ts` |
| `san_pham_thuong_hieu` | `ProductBrand` | `brands/entities/product-brand.entity.ts` |

#### `danh_muc` → `Category`

| DB Column | Property | Type |
|---|---|---|
| `danh_muc_id` | `id` | `number` PK |
| `ten_danh_muc` | `name` | `string` |
| `slug` | `slug` | `string` |
| `node_type` | `nodeType` | `string` (`'category'|'filter'|'label'`) |
| `filter_params` | `filterParams` | `object` JSON nullable |
| `danh_muc_cha_id` | `parentId` | `number` FK self nullable |
| `cap_do_hien_thi` | `level` | `number` |
| `thu_tu_hien_thi` | `sortOrder` | `number` |
| `hinh_anh` | `imageUrl` | `string` nullable |
| `trang_thai` | `status` | `string` (`'Hien'|'An'`) |
| `badge_text` | `badgeText` | `string` nullable |
| `badge_bg` | `badgeBg` | `string` nullable (hex) |
| `badge_fg` | `badgeFg` | `string` nullable (hex) |
| `asset_id` | `assetId` | `number` FK nullable |

---

### Products / Specs / Media / BuildPC

| DB Table | Entity Class | File |
|---|---|---|
| `san_pham` | `Product` | `products/entities/product.entity.ts` |
| `phien_ban_san_pham` | `ProductVariant` | `products/entities/product-variant.entity.ts` |
| `hinh_anh_san_pham` | `ProductImage` | `products/entities/product-image.entity.ts` |
| `nhom_thong_so` | `SpecGroup` | `specifications/entities/spec-group.entity.ts` |
| `loai_thong_so` | `SpecType` | `specifications/entities/spec-type.entity.ts` |
| `danh_muc_nhom_thong_so` | `CategorySpecGroup` | `specifications/entities/category-spec-group.entity.ts` |
| `gia_tri_thong_so` | `SpecValue` | `specifications/entities/spec-value.entity.ts` |
| `media_asset` | `MediaAsset` | `media/entities/media-asset.entity.ts` |
| `buildpc_slot_dinh_nghia` | `BuildSlot` | `build-pc/entities/build-slot.entity.ts` |
| `buildpc_quy_tac_tuong_thich` | `CompatibilityRule` | `build-pc/entities/compatibility-rule.entity.ts` |
| `buildpc_da_luu` | `SavedBuild` | `build-pc/entities/saved-build.entity.ts` |
| `buildpc_chi_tiet` | `BuildDetail` | `build-pc/entities/build-detail.entity.ts` |

#### `san_pham` → `Product`

| DB Column | Property | Type |
|---|---|---|
| `san_pham_id` | `id` | `number` PK |
| `danh_muc_id` | `categoryId` | `number` FK |
| `maSanPham` | `productCode` | `string` UNIQUE |
| `ten_san_pham` | `name` | `string` FULLTEXT |
| `Slug` | `slug` | `string` UNIQUE |
| `mo_ta_ngan` | `shortDescription` | `string` nullable |
| `mo_ta_chi_tiet` | `description` | `string` nullable HTML |
| `chinh_sach_bao_hanh` | `warrantyPolicy` | `string` nullable |
| `diem_danh_gia_tb` | `avgRating` | `number` auto-updated |
| `so_luot_danh_gia` | `reviewCount` | `number` |
| `trang_thai` | `status` | `string` (`'DangBan'|'NgungBan'|'Nhap'`) |
| `ngay_tao` | `createdAt` | `Date` |
| `ngay_cap_nhat` | `updatedAt` | `Date` |
| `nguoi_tao_id` | `createdById` | `number` FK → `nhan_vien` |

#### `phien_ban_san_pham` → `ProductVariant`

| DB Column | Property | Type |
|---|---|---|
| `phien_ban_id` | `id` | `number` PK |
| `san_pham_id` | `productId` | `number` FK |
| `ten_phien_ban` | `name` | `string` |
| `SKU` | `sku` | `string` UNIQUE |
| `gia_goc` | `originalPrice` | `number` DECIMAL |
| `gia_ban` | `salePrice` | `number` DECIMAL |
| `trong_luong` | `weight` | `number` nullable kg |
| `trang_thai` | `status` | `string` (`'HienThi'|'An'|'HetHang'`) |
| `ngay_cap_nhat` | `updatedAt` | `Date` |
| `mo_ta_chi_tiet` | `description` | `string` nullable |
| `chinh_sach_bao_hanh` | `warrantyPolicy` | `string` nullable |

#### `media_asset` → `MediaAsset`

| DB Column | Property | Type |
|---|---|---|
| `asset_id` | `id` | `number` PK |
| `cloudinary_id` | `cloudinaryId` | `string` UNIQUE |
| `cloudinary_ver` | `cloudinaryVersion` | `number` |
| `url_goc` | `url` | `string` |
| `ten_file_goc` | `originalFileName` | `string` |
| `loai_file` | `fileType` | `string` (`'image'|'video'|'raw'`) |
| `mime_type` | `mimeType` | `string` |
| `kich_thuoc_byte` | `sizeBytes` | `number` |
| `chieu_rong` | `width` | `number` nullable |
| `chieu_cao` | `height` | `number` nullable |
| `alt_text` | `altText` | `string` nullable |
| `thu_muc` | `folder` | `string` nullable |
| `tags` | `tags` | `object` JSON nullable |
| `so_lan_su_dung` | `usageCount` | `number` |
| `trang_thai` | `status` | `string` (`'active'|'archived'`) |
| `nguoi_upload_id` | `uploadedById` | `number` FK |
| `ngay_upload` | `uploadedAt` | `Date` |
| `ngay_cap_nhat` | `updatedAt` | `Date` |

---

### Cart / Orders / Payments

| DB Table | Entity Class | File |
|---|---|---|
| `gio_hang` | `Cart` | `cart/entities/cart.entity.ts` |
| `chi_tiet_gio_hang` | `CartItem` | `cart/entities/cart-item.entity.ts` |
| `don_hang` | `Order` | `orders/entities/order.entity.ts` |
| `chi_tiet_don_hang` | `OrderItem` | `orders/entities/order-item.entity.ts` |
| `lich_su_trang_thai_don` | `OrderStatusHistory` | `orders/entities/order-status-history.entity.ts` |
| `dia_chi_giao_hang` | `ShippingAddress` | `users/entities/shipping-address.entity.ts` |
| `giao_dich` | `Transaction` | `payments/entities/transaction.entity.ts` |

#### `don_hang` → `Order`

| DB Column | Property | Type |
|---|---|---|
| `don_hang_id` | `id` | `number` PK |
| `ma_don_hang` | `orderCode` | `string` UNIQUE |
| `khach_hang_id` | `customerId` | `number` FK |
| `dia_chi_giao_hang_id` | `shippingAddressId` | `number` FK |
| `nhan_vien_xu_ly_id` | `handledById` | `number` FK nullable |
| `trang_thai_don` | `status` | `string` (`'ChoTT'|'DaXacNhan'|'DongGoi'|'DangGiao'|'DaGiao'|'DaHuy'|'HoanTra'`) |
| `phuong_thuc_van_chuyen` | `shippingMethod` | `string` |
| `phi_van_chuyen` | `shippingFee` | `number` |
| `tong_tien_hang` | `subtotal` | `number` |
| `so_tien_giam_gia` | `discountAmount` | `number` |
| `discount_total` | `discountTotal` | `number` |
| `tong_thanh_toan` | `totalAmount` | `number` |
| `ghi_chu_khach` | `customerNote` | `string` nullable |
| `ngay_dat_hang` | `orderedAt` | `Date` |
| `ngay_cap_nhat` | `updatedAt` | `Date` |

#### `giao_dich` → `Transaction`

| DB Column | Property | Type |
|---|---|---|
| `giao_dich_id` | `id` | `number` PK |
| `don_hang_id` | `orderId` | `number` FK UNIQUE |
| `phuong_thuc_thanh_toan` | `paymentMethod` | `string` (`'COD'|'ChuyenKhoan'|'VNPay'|'MoMo'|'TraGop'`) |
| `so_tien` | `amount` | `number` |
| `trang_thai_giao_dich` | `status` | `string` (`'Cho'|'ThanhCong'|'ThatBai'|'DaHoan'`) |
| `ma_giao_dich_ngoai` | `externalTransactionId` | `string` nullable |
| `ngan_hang_vi` | `bankOrWallet` | `string` nullable |
| `thoi_diem_thanh_toan` | `paidAt` | `Date` nullable |
| `ngay_tao` | `createdAt` | `Date` |
| `ghi_chu_loi` | `errorNote` | `string` nullable |

---

### Inventory / Suppliers

| DB Table | Entity Class | File |
|---|---|---|
| `kho_hang` | `Warehouse` | `inventory/entities/warehouse.entity.ts` |
| `ton_kho` | `StockLevel` | `inventory/entities/stock-level.entity.ts` |
| `lich_su_nhap_xuat` | `StockHistory` | `inventory/entities/stock-history.entity.ts` |
| `phieu_nhap_kho` | `ImportReceipt` | `inventory/entities/import-receipt.entity.ts` |
| `chi_tiet_phieu_nhap` | `ImportReceiptItem` | `inventory/entities/import-receipt-item.entity.ts` |
| `nha_cung_cap` | `Supplier` | `suppliers/entities/supplier.entity.ts` |

#### `ton_kho` → `StockLevel`

| DB Column | Property | Type |
|---|---|---|
| `ton_kho_id` | `id` | `number` PK |
| `phien_ban_id` | `variantId` | `number` FK |
| `kho_id` | `warehouseId` | `number` FK |
| `so_luong_ton` | `quantity` | `number` |
| `nguong_canh_bao` | `lowStockThreshold` | `number` default 5 |
| `vi_tri_luu_tru` | `storageLocation` | `string` nullable |
| `ngay_cap_nhat` | `updatedAt` | `Date` |

---

### Promotions / Flash Sales / Loyalty

| DB Table | Entity Class | File |
|---|---|---|
| `promotions` | `Promotion` | `promotions/entities/promotion.entity.ts` |
| `promotion_scope` | `PromotionScope` | `promotions/entities/promotion-scope.entity.ts` |
| `promotion_condition` | `PromotionCondition` | `promotions/entities/promotion-condition.entity.ts` |
| `promotion_action` | `PromotionAction` | `promotions/entities/promotion-action.entity.ts` |
| `promotion_usage` | `PromotionUsage` | `promotions/entities/promotion-usage.entity.ts` |
| `promotion_action_bulk_tier` | `BulkTier` | `promotions/entities/bulk-tier.entity.ts` |
| `promotion_action_bulk_component` | `BulkComponent` | `promotions/entities/bulk-component.entity.ts` |
| `flash_sale` | `FlashSale` | `flash-sales/entities/flash-sale.entity.ts` |
| `flash_sale_item` | `FlashSaleItem` | `flash-sales/entities/flash-sale-item.entity.ts` |
| `loyalty_earn_rules` | `LoyaltyEarnRule` | `loyalty/entities/loyalty-earn-rule.entity.ts` |
| `loyalty_earn_rule_scope` | `LoyaltyEarnRuleScope` | `loyalty/entities/loyalty-earn-rule-scope.entity.ts` |
| `loyalty_point_transaction` | `LoyaltyTransaction` | `loyalty/entities/loyalty-transaction.entity.ts` |
| `loyalty_redemption_catalog` | `RedemptionCatalog` | `loyalty/entities/redemption-catalog.entity.ts` |
| `loyalty_redemption` | `LoyaltyRedemption` | `loyalty/entities/loyalty-redemption.entity.ts` |

#### `promotions` → `Promotion` (key fields)

| DB Column | Property | Values |
|---|---|---|
| `type` | `type` | `'standard'|'bxgy'|'bundle'|'bulk'|'free_shipping'` |
| `is_coupon` | `isCoupon` | boolean (TRUE = needs code, FALSE = auto-apply) |
| `status` | `status` | `'draft'|'active'|'scheduled'|'paused'|'ended'|'cancelled'` |
| `stacking_policy` | `stackingPolicy` | `'exclusive'|'stackable'|'stackable_with_coupons_only'` |

---

### Reviews / Returns / Support

| DB Table | Entity Class | File |
|---|---|---|
| `danh_gia_san_pham` | `ProductReview` | `reviews/entities/product-review.entity.ts` |
| `danh_gia_message` | `ReviewMessage` | `reviews/entities/review-message.entity.ts` |
| `yeu_cau_doi_tra` | `ReturnRequest` | `returns/entities/return-request.entity.ts` |
| `yeu_cau_doi_tra_asset` | `ReturnAsset` | `returns/entities/return-asset.entity.ts` |
| `ticket_khieu_nai` | `SupportTicket` | `support/entities/support-ticket.entity.ts` |
| `ticket_message` | `TicketMessage` | `support/entities/ticket-message.entity.ts` |
| `ticket_attachment` | `TicketAttachment` | `support/entities/ticket-attachment.entity.ts` |

---

### Notifications / Wishlist / Search

| DB Table | Entity Class | File |
|---|---|---|
| `thong_bao` | `Notification` | `notifications/entities/notification.entity.ts` |
| `thong_bao_tu_dong_cau_hinh` | `AutoNotificationConfig` | `notifications/entities/auto-notification-config.entity.ts` |
| `whislist` | `Wishlist` | `wishlist/entities/wishlist.entity.ts` |
| `whislist_item` | `WishlistItem` | `wishlist/entities/wishlist-item.entity.ts` |
| `product_view_history` | `ProductViewHistory` | `search/entities/product-view-history.entity.ts` |

---

### CMS / Reports / Settings

| DB Table | Entity Class | File |
|---|---|---|
| `banner_noi_dung` | `Banner` | `cms/entities/banner.entity.ts` |
| `homepage_section` | `HomepageSection` | `cms/entities/homepage-section.entity.ts` |
| `homepage_section_item` | `HomepageSectionItem` | `cms/entities/homepage-section-item.entity.ts` |
| `trang_noi_dung` | `StaticPage` | `cms/entities/static-page.entity.ts` |
| `faq_nhom` | `FaqGroup` | `cms/entities/faq-group.entity.ts` |
| `faq_item` | `FaqItem` | `cms/entities/faq-item.entity.ts` |
| `menu` | `Menu` | `cms/entities/menu.entity.ts` |
| `menu_item` | `MenuItem` | `cms/entities/menu-item.entity.ts` |
| `popup_thong_bao` | `PopupNotification` | `cms/entities/popup-notification.entity.ts` |
| `site_config` | `SiteConfig` | `cms/entities/site-config.entity.ts` |
| `report_daily_revenue` | `DailyRevenueReport` | `reports/entities/daily-revenue-report.entity.ts` |
| `report_rfm_snapshot` | `RfmSnapshot` | `reports/entities/rfm-snapshot.entity.ts` |
| `report_retention_cohort` | `RetentionCohort` | `reports/entities/retention-cohort.entity.ts` |
| `report_inventory_health` | `InventoryHealthReport` | `reports/entities/inventory-health-report.entity.ts` |
| `report_job_log` | `ReportJobLog` | `reports/entities/report-job-log.entity.ts` |

---

## ERD Constraints Summary

- **PK**: all integer + AUTO_INCREMENT (no UUIDs — monolith architecture)
- **Currency**: `DECIMAL(18,2)` for all monetary values
- **Enum**: stored as `VARCHAR` with documented valid values (not MySQL ENUM)
- **Timestamps**: stored as `TIMESTAMP` UTC; app handles timezone conversion
- **JSON columns**: stored as `TEXT` (or MySQL `JSON` if available)
- **Soft delete**: use status field (`'BiKhoa'`, `'An'`, `'NgungBan'`)
- **Snapshot columns**: order items store `ten_san_pham_snapshot`, `SKU_snapshot` to preserve history
