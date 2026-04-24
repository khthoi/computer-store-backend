# TESTING.md — AI Agent Testing Skills

## 1. API Test Runner (`tools/api-test`)

TypeScript-native test runner — gọi live API, không mock.

### Tài khoản test

#### Admin / Employees

| Email | Mật khẩu | Role | Trạng thái |
|---|---|---|---|
| `admin@pcstore.vn` | `Admin@123` | admin | DangLam |
| `staff01@pcstore.vn` | `Staff@123` | staff | DangLam |
| `staff02@pcstore.vn` | `Staff@123` | staff | DangLam |
| `warehouse@pcstore.vn` | `Staff@123` | warehouse | DangLam |
| `ketoan@pcstore.vn` | `Staff@123` | accountant | DangLam |
| `cskh01@pcstore.vn` | `Staff@123` | support | DangLam |
| `cskh02@pcstore.vn` | `Staff@123` | support | NghiViec |

**API đăng nhập admin:** `POST http://localhost:4000/api/auth/admin/login`  
Body: `{"email":"admin@pcstore.vn","matKhau":"Admin@123"}`

#### Customers

| Email | Mật khẩu | Trạng thái | Điểm |
|---|---|---|---|
| `nguyenvana@gmail.com` | `Admin@123` | HoatDong | 1200 |
| `tranthib@gmail.com` | `Admin@123` | HoatDong | 850 |
| `leminhc@gmail.com` | `Admin@123` | HoatDong | 2500 |
| `buivanhung@gmail.com` | `Admin@123` | BiKhoa | 200 |

**API đăng nhập customer:** `POST http://localhost:4000/api/auth/login`  
Body: `{"email":"nguyenvana@gmail.com","matKhau":"Admin@123"}`

---

### Chạy runner

```bash
npm run test:api              # toàn bộ 3 suites (49 cases)
npm run test:api:auth         # chỉ Auth suite
npm run test:api:public       # chỉ Public Endpoints suite
npm run test:api:admin        # chỉ Admin Endpoints suite

# Filter tùy chọn
ts-node -r tsconfig-paths/register tools/api-test/run.ts --suite=auth,admin
```

> Server phải đang chạy (`npm run start:dev`) trước khi chạy runner.

### Output mẫu

```
  ══ PC Store API Test Runner ══

  Auth
    ✓ [200] Customer login — success (142ms)
    ✓ [200] Admin login — success (89ms)
    ✗ Customer login — wrong password → 401
      → Expected HTTP 401, got 200. Body: {"statusCode":200,...}

  Public Endpoints
    ✓ [200] GET /categories — returns list (38ms)
    ✓ [200] GET /products — returns paginated list (61ms)
    ○ GET /search — basic keyword query  ← skipped

  ────────────────────────────────────────────
  Tests: 49  ✓ 47 passed  ✗ 1 failed  ○ 1 skipped
  Time:  1243ms total
```

### Thêm test case mới

Tạo hoặc sửa file trong `tools/api-test/suites/`.  
Đăng ký suite mới trong `suites/index.ts` và `run.ts`.

```typescript
{
  name: 'POST /admin/brands — create',
  method: 'POST',
  path: '/admin/brands',
  auth: 'admin',                         // 'admin' | 'customer' | 'none'
  body: { tenThuongHieu: 'Test Brand' },
  extract: { brandId: 'data.id' },       // lưu vào context cho cases sau
  expect: {
    status: 201,
    bodyMatch: { 'data.tenThuongHieu': 'Test Brand' },  // dot-path match
    contains: 'tenThuongHieu',
  },
},
{
  name: 'DELETE /admin/brands/:id — cleanup',
  method: 'DELETE',
  path: '/admin/brands/{{brandId}}',     // {{var}} inject từ extract ở trên
  auth: 'admin',
  expect: { status: 200 },
},
```

| Field | Mô tả |
|---|---|
| `auth` | `'admin'` → dùng `admin@pcstore.vn`; `'customer'` → `nguyenvana@gmail.com`. Token cache suốt session. |
| `extract` | Trích giá trị từ response body bằng dot-path (`data.id`, `data.accessToken`) |
| `bodyMatch` | Kiểm tra theo dot-path — không cần full match |
| `skip: true` | Bỏ qua test case |

### Cấu trúc file

```
tools/api-test/
├── types.ts         # TestCase, TestSuite, Expect, RunContext interfaces
├── client.ts        # fetch wrapper (Node 20 built-in fetch)
├── auth.ts          # token cache + auto-login
├── context.ts       # {{variable}} interpolation + dot-path extraction
├── assert.ts        # bodyMatch deep comparison
├── runner.ts        # runSuite / runAll
├── reporter.ts      # colored terminal output
├── run.ts           # CLI entry point
└── suites/
    ├── auth.suite.ts    — 9 cases
    ├── public.suite.ts  — 18 cases
    └── admin.suite.ts   — 22 cases
```

---

## 2. Insert Fake Data via dbhub MCP

Use the **dbhub MCP server** to query and seed the database directly — no CLI needed. Two tools are available:

| Tool | Purpose |
|---|---|
| `mcp__dbhub__execute_sql` | Run any SQL (SELECT, INSERT, DELETE, ALTER…) |
| `mcp__dbhub__search_objects` | Inspect schema: tables, columns, indexes, procedures |

The server is pre-configured to connect to:

| Parameter | Value                       |
|-----------|-----------------------------|
| Host      | 127.0.0.1                   |
| Port      | 3306                        |
| Database  | `pc-retails-store-database` |
| Username  | root                        |
| Password  | _(empty)_                   |

### Schema inspection

```
# List all tables in the database
mcp__dbhub__search_objects(object_type="table", schema="pc-retails-store-database")

# Show columns + types for a specific table
mcp__dbhub__search_objects(
  object_type="column",
  schema="pc-retails-store-database",
  table="table_name",
  detail_level="full"
)

# List indexes on a table
mcp__dbhub__search_objects(
  object_type="index",
  schema="pc-retails-store-database",
  table="table_name"
)
```

### Seed patterns

Read the seed file content and pass the SQL directly to `execute_sql`. Multiple statements are separated by `;`.

> **Required:** always include `SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;` at the top when the SQL contains Vietnamese text.

```
# Seed inline SQL
mcp__dbhub__execute_sql(sql="
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
INSERT INTO `pc-retails-store-database`.quyen (ten_quyen, mo_ta) VALUES (...);
INSERT INTO `pc-retails-store-database`.vai_tro (ten_vai_tro) VALUES (...);
")

# For large seed files: read the file first, then pass its content to execute_sql
# Read: src/database/seeds/test-data.sql   → Phase 1
# Read: src/database/seeds/seed-phase2.sql → Phase 2
```

Current seed files:
- `src/database/seeds/test-data.sql` — Phase 1 (auth / users / employees / roles)
- `src/database/seeds/seed-phase2.sql` — Phase 2 (categories / brands / products / media)

### Verify after insert

```
mcp__dbhub__execute_sql(sql="
SELECT COUNT(*) AS total_permissions FROM `pc-retails-store-database`.quyen;
SELECT COUNT(*) AS total_roles       FROM `pc-retails-store-database`.vai_tro;
SELECT COUNT(*) AS total_role_perms  FROM `pc-retails-store-database`.vai_tro_quyen;
SELECT COUNT(*) AS total_employees   FROM `pc-retails-store-database`.nhan_vien;
SELECT COUNT(*) AS total_customers   FROM `pc-retails-store-database`.khach_hang;
SELECT COUNT(*) AS total_addresses   FROM `pc-retails-store-database`.dia_chi_giao_hang;
")

Expected counts after full seed:

**Phase 1 (Auth/Users/Employees/Roles):**

| Table             | Row count |
|-------------------|-----------|
| quyen             | 108       |
| vai_tro           | 5         |
| vai_tro_quyen     | 142       |
| nhan_vien         | 7         |
| nhan_vien_vai_tro | 7         |
| khach_hang        | 10        |
| dia_chi_giao_hang | 12        |

**Phase 2 (Categories/Brands/Specs/Products/Media/BuildPC):**
Seed file: `src/database/seeds/seed-phase2.sql`

| Table                       | Row count |
|-----------------------------|-----------|
| danh_muc                    | 11        |
| thuong_hieu                 | 11        |
| nhom_thong_so               | 8         |
| loai_thong_so               | 40        |
| danh_muc_nhom_thong_so      | 10        |
| san_pham                    | 27        |
| phien_ban_san_pham          | 27        |
| hinh_anh_san_pham           | 27        |
| san_pham_thuong_hieu        | 32        |
| gia_tri_thong_so            | 193       |
| buildpc_slot_dinh_nghia     | 7         |
| buildpc_quy_tac_tuong_thich | 4         |

### Reset / clean up test data

Run in this exact order to avoid FK violations:

```
mcp__dbhub__execute_sql(sql="
DELETE FROM `pc-retails-store-database`.nhan_vien_vai_tro;
DELETE FROM `pc-retails-store-database`.vai_tro_quyen;
DELETE FROM `pc-retails-store-database`.dia_chi_giao_hang;
DELETE FROM `pc-retails-store-database`.nhan_vien;
DELETE FROM `pc-retails-store-database`.khach_hang;
DELETE FROM `pc-retails-store-database`.vai_tro;
DELETE FROM `pc-retails-store-database`.quyen;
ALTER TABLE `pc-retails-store-database`.nhan_vien      AUTO_INCREMENT = 1;
ALTER TABLE `pc-retails-store-database`.khach_hang     AUTO_INCREMENT = 1;
ALTER TABLE `pc-retails-store-database`.vai_tro        AUTO_INCREMENT = 1;
ALTER TABLE `pc-retails-store-database`.quyen          AUTO_INCREMENT = 1;
ALTER TABLE `pc-retails-store-database`.dia_chi_giao_hang AUTO_INCREMENT = 1;
")
```

### Generate password hash (bcrypt)

The backend uses `bcryptjs`. Run from the backend directory:

```bash
node -e "
const bcrypt = require('bcryptjs');
async function main() {
  console.log('Admin@123: ', await bcrypt.hash('Admin@123', 10));
  console.log('Staff@123: ', await bcrypt.hash('Staff@123', 10));
}
main();
"
```

Paste the hash into the `mat_khau_hash` column when creating new records.

### Quick schema inspection

```
# List all tables
mcp__dbhub__search_objects(object_type="table", schema="pc-retails-store-database")

# Show columns for a table
mcp__dbhub__search_objects(
  object_type="column",
  schema="pc-retails-store-database",
  table="nhan_vien",
  detail_level="full"
)

# Check current row counts across all tables
mcp__dbhub__execute_sql(sql="
SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = 'pc-retails-store-database'
ORDER BY table_rows DESC;
")
```

### AI Agent guide

When adding test data for a new table:

1. **Inspect the table structure** before writing INSERT:
   ```
   mcp__dbhub__search_objects(object_type="column", schema="pc-retails-store-database", table="table_name", detail_level="full")
   ```

2. **Check FKs** — look up parent tables before inserting child rows (e.g., `khach_hang` must exist before `dia_chi_giao_hang`).

3. **Correct insertion order** to avoid FK violations:
   ```
   quyen → vai_tro → vai_tro_quyen
   nhan_vien → nhan_vien_vai_tro
   khach_hang → dia_chi_giao_hang
   ```

4. **Password hashes** must always use bcryptjs (rounds = 10) — never store plain text.

5. **Always include** `SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;` at the top of any SQL with Vietnamese text to avoid encoding issues.

6. **Use SELECT subqueries** instead of hardcoded IDs when inserting junction tables:
   ```
   mcp__dbhub__execute_sql(sql="
   SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
   INSERT INTO `pc-retails-store-database`.nhan_vien_vai_tro (nhan_vien_id, vai_tro_id)
   SELECT nv.nhan_vien_id, vt.vai_tro_id
   FROM `pc-retails-store-database`.nhan_vien nv, `pc-retails-store-database`.vai_tro vt
   WHERE nv.ma_nhan_vien = 'NV001' AND vt.ten_vai_tro = 'admin';
   ")
   ```

---

## When to use which

| Scenario | Tool |
|---|---|
| Test endpoints với pass/fail report | `npm run test:api` (runner) |
| Test CRUD cycle với chained context | runner với `extract` + `{{var}}` |
| Seed bulk fake records fast | dbhub `execute_sql` |
| Set up a specific DB state for a test | dbhub `execute_sql` |
| Inspect table columns / indexes | dbhub `search_objects` |
| Test full request → DB round-trip | runner + dbhub verify |
