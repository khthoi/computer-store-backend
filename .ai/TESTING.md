# TESTING.md — AI Agent Testing Skills

## 1. Test API with cURL

Use cURL to send **real HTTP requests** — this tests actual network routing, CORS headers, auth flow, and cookie handling that unit tests cannot cover.

### Base pattern

```bash
# GET with Bearer token
curl -s -X GET http://localhost:4000/api/<endpoint> \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" | jq .

# POST with JSON body
curl -s -X POST http://localhost:4000/api/<endpoint> \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}' | jq .
```

### Auth: obtain tokens first

```bash
# Login → captures access_token and refresh_token (HttpOnly cookie)
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "admin@example.com", "matKhau": "password123"}' | jq .

# Use saved cookie jar for subsequent requests (refresh flow)
curl -s -X POST http://localhost:4000/api/auth/refresh \
  -b cookies.txt -c cookies.txt | jq .
```

### Test CORS (simulate browser preflight from admin frontend)

```bash
# Preflight OPTIONS — server must return Allow-Origin and Allow-Methods
curl -s -X OPTIONS http://localhost:4000/api/products \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type" \
  -v 2>&1 | grep -E "< (Access-Control|HTTP)"

# Actual cross-origin GET with Origin header
curl -s -X GET http://localhost:4000/api/products \
  -H "Origin: http://localhost:3000" \
  -H "Authorization: Bearer <token>" | jq .
```

### Common flags reference

| Flag | Purpose |
|---|---|
| `-s` | Silent (no progress bar) |
| `-v` | Verbose — shows request + response headers |
| `-X <METHOD>` | HTTP method |
| `-H "key: value"` | Add request header |
| `-d '{"json":true}'` | Request body |
| `-b cookies.txt` | Send cookies from file |
| `-c cookies.txt` | Save cookies to file |
| `-o /dev/null` | Discard body (useful with `-v` for headers only) |
| `\| jq .` | Pretty-print JSON response |

### Rate-limit testing

```bash
# Fire 20 requests quickly — expect 429 after threshold
for i in $(seq 1 20); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    http://localhost:4000/api/products
done
```

---

## 2. Insert Fake Data via MySQL CLI

Use the MySQL CLI to seed test data directly — faster than REST for bulk inserts and for bypassing validation when you need raw DB state.

### Connection info

| Parameter | Value                       |
|-----------|-----------------------------|
| Host      | 127.0.0.1                   |
| Port      | 3306                        |
| Database  | `pc-retails-store-database` |
| Username  | root                        |
| Password  | _(empty)_                   |

### MySQL CLI path (Windows)

```
C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe
```

In bash (Git Bash / WSL):

```bash
MYSQL="/c/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe"
```

### Connect

```bash
# List all databases
"/c/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe" \
  -u root --host=127.0.0.1 --port=3306 \
  -e "SHOW DATABASES;"

# List all tables in the database
"/c/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe" \
  -u root --host=127.0.0.1 --port=3306 \
  -e "USE \`pc-retails-store-database\`; SHOW TABLES;"

# Show columns for a table
"/c/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe" \
  -u root --host=127.0.0.1 --port=3306 \
  -e "USE \`pc-retails-store-database\`; DESCRIBE table_name;"
```

### Seed patterns

> **Required:** always pass `--default-character-set=utf8mb4` when running files with Vietnamese text,
> combined with `SET NAMES utf8mb4` at the top of the SQL file to avoid character encoding errors.

```bash
# Seed via a .sql file (preferred for large datasets)
"/c/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe" \
  -u root --host=127.0.0.1 --port=3306 \
  --default-character-set=utf8mb4 \
  < "d:/Online PC Store System/Source/computer-store-backend/src/database/seeds/test-data.sql"
```

Current seed file: `src/database/seeds/test-data.sql`

### Verify after insert

```bash
"/c/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe" \
  -u root --host=127.0.0.1 --port=3306 -e "
USE \`pc-retails-store-database\`;
SELECT COUNT(*) as total_permissions    FROM quyen;
SELECT COUNT(*) as total_roles          FROM vai_tro;
SELECT COUNT(*) as total_role_perms     FROM vai_tro_quyen;
SELECT COUNT(*) as total_employees      FROM nhan_vien;
SELECT COUNT(*) as total_customers      FROM khach_hang;
SELECT COUNT(*) as total_addresses      FROM dia_chi_giao_hang;
"
```

Expected counts after full seed:

| Table             | Row count |
|-------------------|-----------|
| quyen             | 108       |
| vai_tro           | 5         |
| vai_tro_quyen     | 142       |
| nhan_vien         | 7         |
| nhan_vien_vai_tro | 7         |
| khach_hang        | 10        |
| dia_chi_giao_hang | 12        |

### Reset / clean up test data

Run in this exact order to avoid FK violations:

```bash
"/c/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe" \
  -u root --host=127.0.0.1 --port=3306 -e "
USE \`pc-retails-store-database\`;
DELETE FROM nhan_vien_vai_tro;
DELETE FROM vai_tro_quyen;
DELETE FROM dia_chi_giao_hang;
DELETE FROM nhan_vien;
DELETE FROM khach_hang;
DELETE FROM vai_tro;
DELETE FROM quyen;
ALTER TABLE nhan_vien      AUTO_INCREMENT = 1;
ALTER TABLE khach_hang     AUTO_INCREMENT = 1;
ALTER TABLE vai_tro        AUTO_INCREMENT = 1;
ALTER TABLE quyen          AUTO_INCREMENT = 1;
ALTER TABLE dia_chi_giao_hang AUTO_INCREMENT = 1;
"
```

### Generate password hash (bcrypt)

The backend uses `bcryptjs`. Run from the backend directory:

```bash
node -e "
const bcrypt = require('bcryptjs');
async function main() {
  console.log('Admin@123:   ', await bcrypt.hash('Admin@123',    10));
  console.log('Staff@123:   ', await bcrypt.hash('Staff@123',    10));
  console.log('Customer@123:', await bcrypt.hash('Customer@123', 10));
}
main();
"
```

Paste the hash into the `mat_khau_hash` column when creating new records.

### Quick schema inspection

```bash
# List tables
"/c/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe" \
  -u root --host=127.0.0.1 --port=3306 \
  -e "USE \`pc-retails-store-database\`; SHOW TABLES;"

# Show columns for a table
"/c/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe" \
  -u root --host=127.0.0.1 --port=3306 \
  -e "USE \`pc-retails-store-database\`; DESCRIBE nguoi_dung;"

# Check current row counts
"/c/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe" \
  -u root --host=127.0.0.1 --port=3306 -e "
  SELECT table_name, table_rows
  FROM information_schema.tables
  WHERE table_schema = 'pc-retails-store-database'
  ORDER BY table_rows DESC;
"
```

### Current test accounts

#### Employees (password: `Admin@123` for admin, `Staff@123` for others)

| ID    | Email                    | Full name         | Role       | Status   |
|-------|--------------------------|-------------------|------------|----------|
| NV001 | admin@pcstore.vn         | Nguyen Van Admin  | admin      | DangLam  |
| NV002 | staff01@pcstore.vn       | Tran Thi Lan      | staff      | DangLam  |
| NV003 | staff02@pcstore.vn       | Le Minh Tuan      | staff      | DangLam  |
| NV004 | warehouse@pcstore.vn     | Pham Van Kho      | warehouse  | DangLam  |
| NV005 | ketoan@pcstore.vn        | Hoang Thi Mai     | accountant | DangLam  |
| NV006 | cskh01@pcstore.vn        | Do Thanh Long     | support    | DangLam  |
| NV007 | cskh02@pcstore.vn        | Vu Thi Hoa        | support    | NghiViec |

#### Customers (password: `Customer@123`)

| Email                    | Full name       | Status   | Verified | Points |
|--------------------------|-----------------|----------|----------|--------|
| nguyenvana@gmail.com     | Nguyen Van A    | HoatDong | ✓        | 1200   |
| tranthib@gmail.com       | Tran Thi B      | HoatDong | ✓        | 850    |
| leminhc@gmail.com        | Le Minh C       | HoatDong | ✓        | 2500   |
| phamthid@gmail.com       | Pham Thi D      | HoatDong | ✓        | 0      |
| hoangvane@gmail.com      | Hoang Van E     | HoatDong | ✗        | 320    |
| dothif@gmail.com         | Do Thi F        | HoatDong | ✓        | 150    |
| vuminh@gmail.com         | Vu Van Minh     | HoatDong | ✓        | 4800   |
| ngothig@gmail.com        | Ngo Thi G       | HoatDong | ✓        | 0      |
| buivanhung@gmail.com     | Bui Van Hung    | BiKhoa   | ✓        | 200    |
| dangthii@gmail.com       | Dang Thi I      | HoatDong | ✗        | 0      |

### AI Agent guide

When adding test data for a new table:

1. **Inspect the table structure** before writing INSERT:
   ```bash
   DESCRIBE table_name;
   ```

2. **Check FKs** — look up parent tables before inserting child rows (e.g., `khach_hang` must exist before `dia_chi_giao_hang`).

3. **Correct insertion order** to avoid FK violations:
   ```
   quyen → vai_tro → vai_tro_quyen
   nhan_vien → nhan_vien_vai_tro
   khach_hang → dia_chi_giao_hang
   ```

4. **Password hashes** must always use bcryptjs (rounds = 10) — never store plain text.

5. **Run via pipe** (`< file.sql`) instead of copy-paste to preserve UTF-8 encoding.
   - Always add `--default-character-set=utf8mb4` to the mysql CLI command.
   - Always put `SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;` at the top of the SQL file.

6. **Use SELECT subqueries** instead of hardcoded IDs when inserting junction tables:
   ```sql
   INSERT INTO nhan_vien_vai_tro (nhan_vien_id, vai_tro_id)
   SELECT nv.nhan_vien_id, vt.vai_tro_id
   FROM nhan_vien nv, vai_tro vt
   WHERE nv.ma_nhan_vien = 'NV001' AND vt.ten_vai_tro = 'admin';
   ```

---

## When to use which

| Scenario | Tool |
|---|---|
| Test auth flow, tokens, cookies | cURL with `-c`/`-b` |
| Verify CORS headers from browser origin | cURL OPTIONS preflight |
| Check rate limiting response codes | cURL loop |
| Seed bulk fake records fast | MySQL CLI |
| Set up a specific DB state for a test | MySQL CLI |
| Test full request → DB round-trip | cURL + MySQL verify |
