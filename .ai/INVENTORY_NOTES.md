# Inventory Module — Design Notes & Open Questions

> Ghi lại các quyết định thiết kế, câu hỏi còn mở và bối cảnh thảo luận trong quá trình build.
> Cập nhật file này mỗi khi có quyết định mới được thống nhất.

---

## 1. Trạng thái hiện tại (2026-05-02)

### Đã implement
| Tính năng | Endpoint | Ghi chú |
|---|---|---|
| Tồn kho (stock levels) | `GET /admin/inventory` | Có filter, sort, phân trang |
| Điều chỉnh tồn kho | `POST /admin/inventory/adjust` | Chỉ còn 3 loại: `Nhap`, `Xuat`, `Huy` |
| Phiếu nhập kho | `GET/POST /admin/inventory/import` | Có approval flow, tạo lô FIFO |
| **Phiếu xuất kho** | `GET/POST /admin/inventory/export` | Mới implement — xem section 2 |
| Lịch sử biến động | `GET /admin/inventory/movements` | |
| Lô hàng (batches) | `GET /admin/inventory/:variantId/batches` | |
| KPI Dashboard | `GET /admin/inventory/kpi/*` | |
| Dự báo nhu cầu | `GET /admin/inventory/forecast/*` | |

---

## 2. Module Phiếu Xuất Kho — Thiết kế đã thống nhất

### 4 loại phiếu xuất

| `loaiPhieu` | Khi nào dùng | Trigger | `loaiGiaoDich` trong history |
|---|---|---|---|
| `XuatHuy` | Hàng hỏng, phá huỷ, không dùng được | Thủ công | `Huy` |
| `XuatDieuChinh` | Kiểm kê thiếu, không rõ nguyên nhân | Thủ công | `Xuat` |
| `XuatNoiBo` | Dùng nội bộ: showroom, văn phòng, kỹ thuật | Thủ công | `Xuat` |
| `XuatBan` | Hàng bán qua đơn hàng | **Tự động** — Phase 3, chưa làm | `Xuat` |

> **Quan trọng:** `XuatBan` không được tạo thủ công — API từ chối nếu truyền `loaiPhieu: 'XuatBan'` trong `CreateExportReceiptDto`.

### Luồng nghiệp vụ
```
Validate tất cả items đủ tồn kho
  → Tạo ExportReceipt (mã PX-YYYYMM-XXXX)
  → Với mỗi item:
      - Tính avgCost từ lô còn hàng
      - Tạo ExportReceiptItem
      - Trừ StockLevel
      - FIFO deduction → deductFromBatches()
      - Ghi StockHistory (1 dòng/lô bị trừ) với phieuXuatId
      - recalcWeightedAvgCost()
  → Cập nhật tongGiaVon phiếu
```

### Điều chỉnh tồn kho (`POST /admin/inventory/adjust`) — sau khi refactor

Chỉ còn 3 loại hợp lệ:

| `loaiGiaoDich` | Ý nghĩa | Luồng backend |
|---|---|---|
| `Nhap` | Kiểm kê thừa, nhập bù | Tạo lô ADJ-*, không tạo phiếu xuất |
| `Xuat` | *(deprecated — dùng XuatDieuChinh)* | Trước đây dùng trực tiếp, nay chuyển qua export receipt |
| `Huy` | *(deprecated — dùng XuatHuy)* | Trước đây dùng trực tiếp, nay chuyển qua export receipt |

> **Lưu ý:** `HoanTra` và `DieuChinh` đã bị xoá khỏi enum. Hoàn trả sẽ có luồng riêng ở module Returns.

---

## 3. Phase 3 — XuatBan tự động từ đơn hàng (CHƯA IMPLEMENT)

### Hiện trạng
Khi khách checkout, `deductFromBatches()` trừ stock ngay (atomic) nhưng **không tạo `ExportReceipt`**. Hàng rời kho nhưng không có chứng từ.

### Cần làm (Phase 3)
Sau khi đơn hàng chuyển sang trạng thái `DaXacNhan` (hoặc `DongGoi`, tuỳ quyết định):
```typescript
// Trong orders.service.ts — khi confirm order:
await inventoryExportsService.createForOrder(orderId, manager);
// → Tạo ExportReceipt loại XuatBan
// → Link don_hang.xuat_id → phieu_xuat_kho.xuat_id
```

### Câu hỏi còn mở
- Tạo `XuatBan` tại thời điểm nào: `DaXacNhan`, `DongGoi`, hay khi `DangGiao`?
- Nếu đơn bị huỷ sau khi đã tạo `XuatBan`: cần tạo phiếu nhập hoàn lại?
- Trường `don_hang.xuat_id` cần thêm vào entity `Order` chưa?

---

## 4. Module Returns — Luồng kho (CHƯA IMPLEMENT — Phase 6)

### Các trường hợp ảnh hưởng tồn kho

#### TraHang (khách trả hàng)
```
Hàng về kho → cần "phiếu nhập hoàn trả" (receipt_type = 'HoanTra')
  - Link với return_request_id
  - Giá vốn = giá vốn gốc lúc bán (snapshot từ order item)
  - Không cần approval flow như nhập từ NCC
  - Nếu hàng bị hỏng → XuatHuy ngay sau khi nhập
```

#### DoiHang (đổi hàng)
```
Hàng cũ về → nhập lại (nếu còn dùng được) hoặc XuatHuy
Hàng mới ra → ExportReceipt loại XuatBan (link với return, không phải order mới)
```

#### BaoHanh (bảo hành)
```
Gửi đi sửa rồi trả lại → không thay đổi tồn kho
Thay thế unit mới       → XuatBan (unit mới) + XuatHuy (unit cũ nếu hỏng)
```

### Quyết định thiết kế còn mở

**Câu hỏi:** Hàng hoàn trả (TraHang/DoiHang) khi về kho dùng luồng nào?

| Phương án | Ưu | Nhược |
|---|---|---|
| **A. Mở rộng `phieu_nhap_kho`** thêm `loaiPhieu = 'HoanTra'` | Tái dụng code, 1 bảng | Bảng nhập NCC lẫn với hoàn trả, approval flow không phù hợp |
| **B. Tạo bảng `phieu_nhap_hoan_tra` riêng** | Tách biệt rõ ràng, schema phù hợp hơn | Thêm entity/service mới |

> **Chưa quyết định.** Sẽ thống nhất khi bắt đầu Phase 6.

---

## 5. Các điểm kỹ thuật cần lưu ý

### FK constraint trên `lich_su_nhap_xuat`
`lo_id` trên bảng `lich_su_nhap_xuat` có dữ liệu cũ không có FK. Khi thêm relation `@ManyToOne` vào `StockHistory.lo`, phải dùng `createForeignKeyConstraints: false` để tránh lỗi migration:
```typescript
@ManyToOne(() => StockBatch, { nullable: true, eager: false, createForeignKeyConstraints: false })
@JoinColumn({ name: 'lo_id' })
lo: StockBatch | null;
```
Tương tự cho `phieuXuat` relation trên cùng entity.

### QueryBuilder — dùng property name, không dùng column name
TypeORM QueryBuilder dùng camelCase property name, không phải DB column name:
```typescript
// ✓ ĐÚNG
.where('h.phieuXuatId = :id', { id })

// ✗ SAI — gây lỗi silently (không match)
.where('h.phieu_xuat_id = :id', { id })
```

### Mã phiếu xuất
Format: `PX-YYYYMM-XXXX` (Vietnam timezone UTC+7, 4 chữ số random).
Không guarantee unique tuyệt đối — nếu cần: thêm `UNIQUE` constraint trên `ma_phieu_xuat` (đã có) và retry khi duplicate.
