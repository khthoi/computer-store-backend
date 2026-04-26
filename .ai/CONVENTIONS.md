# CONVENTIONS.md — Coding Standards & Patterns

## Naming Rules

### Files — kebab-case
```
product-variant.entity.ts       ✓
productVariant.entity.ts        ✗
ProductVariant.entity.ts        ✗
```

### Classes — PascalCase
```typescript
export class ProductVariant { }         // entity
export class CreateProductDto { }       // DTO
export class ProductsService { }        // service
export class ProductsController { }     // controller
export class ProductsModule { }         // module
export class JwtAuthGuard { }           // guard
export class GlobalExceptionFilter { }  // filter
```

### Variables & Properties — camelCase
```typescript
const categoryId = 1;               ✓
const danh_muc_id = 1;             ✗

this.productService.findAll()       ✓
this.san_pham_service.findAll()     ✗
```

### DB Column Mapping
```typescript
@Entity('san_pham')
export class Product {
  @PrimaryGeneratedColumn({ name: 'san_pham_id' })
  id: number;

  @Column({ name: 'ten_san_pham', length: 500 })
  name: string;

  @Column({ name: 'trang_thai', length: 20, default: 'Nhap' })
  status: string;

  @CreateDateColumn({ name: 'ngay_tao' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  updatedAt: Date;
}
```

### API Routes — kebab-case
```
/build-pc           ✓
/buildPC            ✗
/flash-sales        ✓
/flashSales         ✗
```

### Enum Values — lowercase string (stored as VARCHAR)
```typescript
// Define as const object, not TypeScript enum
export const OrderStatus = {
  PENDING: 'ChoTT',
  CONFIRMED: 'DaXacNhan',
  PACKING: 'DongGoi',
  SHIPPING: 'DangGiao',
  DELIVERED: 'DaGiao',
  CANCELLED: 'DaHuy',
  RETURNED: 'HoanTra',
} as const;
```

---

## DTO Patterns

### Create DTO
```typescript
import { IsString, IsInt, IsOptional, IsEnum, MinLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Intel Core i9-14900K' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  categoryId: number;

  @ApiPropertyOptional({ enum: ['DangBan', 'NgungBan', 'Nhap'], default: 'Nhap' })
  @IsEnum(['DangBan', 'NgungBan', 'Nhap'])
  @IsOptional()
  status?: string = 'Nhap';
}
```

### Update DTO
```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

### Query/Filter DTO
```typescript
import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryProductDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsIn(['name', 'salePrice', 'avgRating', 'createdAt'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
```

### Response DTO (REQUIRED — never return entity directly)

Every API endpoint **must** return a typed Response DTO, not a raw entity. Map in the service layer.

```typescript
// dto/product-response.dto.ts
export class ProductSummaryResponseDto {
  @ApiProperty({ example: 1 })           id: number;
  @ApiProperty({ example: 'Intel Core i9-14900K' }) name: string;
  @ApiProperty({ example: 'intel-core-i9-14900k' }) slug: string;
  @ApiProperty({ example: 'Intel' })     brandName: string;   // flattened from brand relation
  @ApiProperty({ example: 15000000 })    salePrice: number;   // from cheapest variant
  @ApiProperty({ example: 'https://cdn.example.com/img.jpg' }) thumbnail: string;
  @ApiProperty({ example: 4.5 })         avgRating: number;
  @ApiProperty({ example: 'DangBan' })   status: string;
}

export class ProductDetailResponseDto extends ProductSummaryResponseDto {
  @ApiProperty({ example: 'Mô tả chi tiết...' })   description: string;
  @ApiProperty({ example: 'Processors' })           categoryName: string;
  @ApiProperty({ type: [VariantResponseDto] })      variants: VariantResponseDto[];
}
```

Write a private mapper in the service — **never** in the controller:

```typescript
// products.service.ts
private toSummaryDto(p: Product): ProductSummaryResponseDto {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    brandName: p.brand?.name ?? '',
    salePrice: Math.min(...p.variants.map(v => v.salePrice)),
    thumbnail: p.images?.[0]?.url ?? '',
    avgRating: p.avgRating,
    status: p.status,
  };
}

async findAll(query: QueryProductDto) {
  const [items, total] = await this.query(query);
  return { items: items.map(p => this.toSummaryDto(p)), total, page: query.page, limit: query.limit };
}
```

**Rules:**
- One Response DTO file per entity (e.g. `product-response.dto.ts`)
- Flatten nested data if frontend needs it in a single object (`brandName` not `brand.name`)
- Never expose DB column names (`khach_hang_id`, `ten_san_pham`) in the response
- `@ApiProperty` required on every field of a Response DTO

---

## Entity Patterns

### Standard entity with relations
```typescript
import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, JoinColumn,
  CreateDateColumn, UpdateDateColumn
} from 'typeorm';

@Entity('don_hang')
export class Order {
  @PrimaryGeneratedColumn({ name: 'don_hang_id' })
  id: number;

  @Column({ name: 'ma_don_hang', length: 255, unique: true })
  orderCode: string;

  @Column({ name: 'trang_thai_don', length: 30, default: 'ChoTT' })
  status: string;

  @Column({ name: 'tong_thanh_toan', type: 'decimal', precision: 18, scale: 2 })
  totalAmount: number;

  // FK stored column
  @Column({ name: 'khach_hang_id' })
  customerId: number;

  // Relation (lazy-load by default — use relations: [] in queries)
  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'khach_hang_id' })
  customer: Customer;

  @OneToMany(() => OrderItem, item => item.order, { cascade: ['insert'] })
  items: OrderItem[];

  @CreateDateColumn({ name: 'ngay_dat_hang' })
  orderedAt: Date;

  @UpdateDateColumn({ name: 'ngay_cap_nhat' })
  updatedAt: Date;
}
```

### Self-referencing entity (Category tree)
```typescript
@Entity('danh_muc')
export class Category {
  @PrimaryGeneratedColumn({ name: 'danh_muc_id' })
  id: number;

  @Column({ name: 'danh_muc_cha_id', nullable: true })
  parentId: number | null;

  @ManyToOne(() => Category, cat => cat.children, { nullable: true })
  @JoinColumn({ name: 'danh_muc_cha_id' })
  parent: Category;

  @OneToMany(() => Category, cat => cat.parent)
  children: Category[];
}
```

---

## Data Layer & Response Rules (REQUIRED)

These rules ensure the API always returns frontend-ready, structured data — never raw DB rows.

### Rule 1 — Declare all relations on entities

Every foreign key column **must** have a corresponding TypeORM relation decorator.

```typescript
// ✓ CORRECT — FK column + matching relation
@Column({ name: 'san_pham_id' })
productId: number;

@ManyToOne(() => Product, product => product.variants)
@JoinColumn({ name: 'san_pham_id' })
product: Product;

// ✗ WRONG — FK column with no relation declared
@Column({ name: 'san_pham_id' })
productId: number;
// (relation missing — frontend cannot get product name without a second call)
```

Required decorators per relation type:

| Relation | Decorators |
|---|---|
| N:1 (child → parent) | `@ManyToOne` + `@JoinColumn({ name: 'fk_col' })` |
| 1:N (parent → children) | `@OneToMany(() => Child, child => child.parent)` |
| 1:1 | `@OneToOne` + `@JoinColumn` on the owning side |
| M:N | `@ManyToMany` + `@JoinTable` on the owning side |

### Rule 2 — Load relations explicitly on every query

Never rely on eager loading or lazy loading — always specify what you need.

**Option A — `findOne` / `findAndCount` with `relations`:**
```typescript
// ✓ Load exactly what you need
const product = await this.productRepo.findOne({
  where: { slug },
  relations: ['brand', 'category', 'variants', 'variants.images'],
});
```

**Option B — QueryBuilder with `leftJoinAndSelect` (preferred for filters/pagination):**
```typescript
// ✓ QueryBuilder: joins + filter + paginate in one query
const qb = this.productRepo.createQueryBuilder('p')
  .leftJoinAndSelect('p.brand', 'brand')
  .leftJoinAndSelect('p.category', 'category')
  .leftJoinAndSelect('p.variants', 'v')
  .leftJoinAndSelect('v.images', 'img')
  .where('p.status = :status', { status: 'DangBan' });

if (query.brandId) {
  qb.andWhere('brand.id = :brandId', { brandId: query.brandId });
}

const [items, total] = await qb
  .skip((query.page - 1) * query.limit)
  .take(query.limit)
  .getManyAndCount();
```

Use `leftJoinAndSelect` when you need the related data in the result.
Use `leftJoin` (no `Select`) when you only need it for filtering, not in the output.

### Rule 3 — Never return raw entity or raw DB columns

```typescript
// ✗ WRONG — returns { san_pham_id, ten_san_pham, ... } directly
return await this.productRepo.find();

// ✗ WRONG — controller builds the response shape
@Get(':id')
async findOne(@Param('id') id: number) {
  const p = await this.productsService.findOne(id);
  return { id: p.id, name: p.name };  // mapping belongs in service
}

// ✓ CORRECT — service maps entity → Response DTO before returning
async findOne(id: number): Promise<ProductDetailResponseDto> {
  const product = await this.productRepo.findOne({
    where: { id },
    relations: ['brand', 'category', 'variants'],
  });
  if (!product) throw new NotFoundException('Sản phẩm không tồn tại');
  return this.toDetailDto(product);
}
```

### Rule 4 — Raw SQL: restricted & parameterized only

Use raw SQL **only** when TypeORM QueryBuilder cannot express the query efficiently (e.g. complex aggregations with subqueries, FULLTEXT search scoring).

```typescript
// ✓ ALLOWED — raw SQL with parameterized values (never string interpolation)
const rows = await this.dataSource.query(
  `SELECT p.san_pham_id, p.ten_san_pham, COUNT(r.danh_gia_id) AS review_count
   FROM san_pham p
   LEFT JOIN danh_gia r ON r.san_pham_id = p.san_pham_id
   WHERE p.danh_muc_id = ?
   GROUP BY p.san_pham_id`,
  [categoryId],   // always pass values as the second argument, NEVER interpolate
);

// ✗ FORBIDDEN — string interpolation = SQL injection risk
const rows = await this.dataSource.query(
  `SELECT * FROM san_pham WHERE danh_muc_id = ${categoryId}`,
);
```

Map raw query results to a Response DTO before returning — never return `rows` directly.

### Decision checklist

```
Need data from one table only?
  → repository.findOne / findAndCount with where clause

Need joined data or filter by relation?
  → QueryBuilder with leftJoinAndSelect / leftJoin

Complex aggregation QueryBuilder can't express?
  → raw SQL with parameterized values, then map to DTO

Always map result → Response DTO before returning from service
Never return entity, never return raw DB columns
```

---

## Service Patterns

### Repository injection (TypeORM)
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { slug, status: 'DangBan' },
      relations: ['variants', 'variants.images', 'category'],
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findAll(query: QueryProductDto) {
    const qb = this.productRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.variants', 'v')
      .where('p.status = :status', { status: 'DangBan' });

    if (query.q) {
      qb.andWhere('MATCH(p.ten_san_pham, p.mo_ta_ngan) AGAINST(:q IN BOOLEAN MODE)', { q: query.q });
    }
    if (query.categoryId) {
      qb.andWhere('p.danh_muc_id = :categoryId', { categoryId: query.categoryId });
    }

    const [items, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { items, total, page: query.page, limit: query.limit };
  }
}
```

### Hard delete with orphan cleanup

When hard-deleting an entity that has child records pointing to it via a plain FK column (no TypeORM cascade), manually delete those children first, then remove the parent.

```typescript
// ✓ Products example — SpecValue.phienBanId is a plain @Column, no cascade
async remove(id: number): Promise<void> {
  const product = await this.findOne(id);   // loads variants via relations: ['variants']
  const variantIds = product.variants.map((v) => v.id);
  if (variantIds.length > 0) {
    // Delete spec values before variants to avoid FK constraint errors
    await this.specValueRepo
      .createQueryBuilder()
      .delete()
      .where('phien_ban_id IN (:...ids)', { ids: variantIds })
      .execute();
  }
  await this.productRepo.remove(product);   // TypeORM entity cascade removes variants + images
}

// ✓ Variant example — spec values and images cleaned up before removing
async removeVariant(variantId: number): Promise<void> {
  const variant = await this.variantRepo.findOne({
    where: { id: variantId },
    relations: ['images'],
  });
  if (!variant) throw new NotFoundException('Biến thể không tồn tại');
  await this.specValueRepo.delete({ phienBanId: variantId });
  await this.variantRepo.remove(variant);   // entity cascade removes images
}
```

**Checklist before hard-deleting any entity:**
1. Identify every table whose FK column points to this entity (grep `phien_ban_id`, `san_pham_id`, etc.)
2. For each child table: does the TypeORM relation have `cascade: ['remove']` or `onDelete: 'CASCADE'`?
   - Yes → TypeORM/DB handles it automatically
   - No → delete children manually before removing the parent

---

### Cross-module usage — inject via exported service
```typescript
// In orders.service.ts — use StockService from inventory module
constructor(
  private readonly stockService: StockService,
  private readonly promotionsService: PromotionsService,
  private readonly loyaltyService: LoyaltyService,
) {}
```

---

## Controller Patterns

### Public + Admin split
```typescript
// products.controller.ts — public routes
@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products' })
  findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }
}

// admin-products.controller.ts — admin routes
@ApiTags('Admin — Products')   // em-dash (—), NOT hyphen (-)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles('product.create')
  create(@Body() dto: CreateProductDto, @CurrentUser() employee: Employee) {
    return this.productsService.create(dto, employee.id);
  }

  @Put(':id')
  @Roles('product.update')
  update(@Param('id') id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('product.delete')
  remove(@Param('id') id: number) {
    return this.productsService.softDelete(id);
  }
}
```

### @Public() for auth bypass
```typescript
@Get('health')
@Public()
healthCheck() {
  return { status: 'ok' };
}
```

### CRITICAL — Route Declaration Order

NestJS matches routes top-to-bottom. **Static-prefix routes must be declared BEFORE parameterized routes** (`:id`, `:slug`) in the same controller class, or the parameterized handler will shadow them.

```typescript
// ✗ WRONG — DELETE /admin/products/variants/123 matches ':id' first
//   ParseIntPipe tries to parse "variants" → throws 400, never reaches removeVariant
@Delete(':id')
remove(@Param('id', ParseIntPipe) id: number) { ... }

@Delete('variants/:variantId')         // never reached
removeVariant(...) { ... }


// ✓ CORRECT — specific prefix declared first
@Delete('variants/:variantId')
removeVariant(@Param('variantId', ParseIntPipe) variantId: number) { ... }

@Delete(':id')
remove(@Param('id', ParseIntPipe) id: number) { ... }
```

**Rule:** for every controller with both `variants/:variantId` and `:id` routes, declare all `variants/...` handlers before any `:id` handlers, and add a comment block separator so the order is explicit and preserved during future edits:

```typescript
// ── Sub-resource routes (declared before :id to avoid NestJS shadowing) ──
@Delete('variants/:variantId')
removeVariant(...) { }

@Put('variants/:variantId')
updateVariant(...) { }

// ── Top-level resource routes ─────────────────────────────────────────────
@Delete(':id')
remove(...) { }
```

---

## Module Registration Pattern

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductVariant, ProductImage]),
    // Import other modules whose services you need
    forwardRef(() => InventoryModule),  // use forwardRef for circular deps
    CategoriesModule,
  ],
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService],
  exports: [ProductsService],  // always export service for cross-module use
})
export class ProductsModule {}
```

---

## Error Handling

### Throw standard NestJS exceptions
```typescript
import {
  NotFoundException, BadRequestException,
  ForbiddenException, ConflictException
} from '@nestjs/common';

// Not found
throw new NotFoundException('Product not found');

// Validation / business rule
throw new BadRequestException('Cannot cancel a delivered order');

// Conflict (duplicate)
throw new ConflictException('SKU already exists');

// Access denied
throw new ForbiddenException('Cannot delete product with active orders');
```

### GlobalExceptionFilter catches all — returns uniform shape:
```json
{ "success": false, "statusCode": 404, "message": "Product not found" }
```

---

## Database Transaction Pattern

Use TypeORM `DataSource.transaction()` for multi-table atomic operations:

```typescript
import { DataSource } from 'typeorm';

@Injectable()
export class OrdersService {
  constructor(private readonly dataSource: DataSource) {}

  async checkout(customerId: number, dto: CheckoutDto) {
    return this.dataSource.transaction(async (manager) => {
      // 1. Create order
      const order = manager.create(Order, { customerId, ... });
      await manager.save(order);

      // 2. Create order items
      for (const item of dto.items) {
        await manager.save(OrderItem, { orderId: order.id, ... });
      }

      // 3. Deduct stock (reserve)
      await manager.decrement(StockLevel, { variantId: item.variantId }, 'quantity', item.quantity);

      // 4. Update loyalty points (denormalized cache — must be in same tx)
      await manager.increment(Customer, { id: customerId }, 'loyaltyPoints', earnedPoints);
      await manager.save(LoyaltyTransaction, { customerId, points: earnedPoints, ... });

      return order;
    });
  }
}
```

---

## File Size Rules

| File type | Max lines | Split strategy |
|---|---|---|
| `*.service.ts` | 400 | Create `-query.service.ts`, `-event.service.ts` |
| `*.controller.ts` | 300 | Split public / admin controllers |
| `*.entity.ts` | 150 | One entity per file |
| `*.dto.ts` | 100 | One DTO per file |
| `*.module.ts` | 70 | — |

---

## Comments Policy

Only add comments for non-obvious reasons:

```typescript
// Denormalized cache — must update atomically with loyalty_point_transaction
customer.loyaltyPoints += earned;

// ERD: 'ChoTT' maps to 'pending' — Vietnamese status values preserved for DB compat
status: 'ChoTT',

// Reserved stock (ton_kho.so_luong_dat_truoc) deducted here, actual stock deducted on confirm
await this.stockService.reserve(variantId, quantity);
```

Never write:
```typescript
// Get product by slug           ← describes WHAT, not WHY
// Loop through cart items       ← obvious from the code
// Added for the checkout flow   ← belongs in PR description, not code
```

---

## Swagger API Standards (REQUIRED)

### 1. Mandatory rules

| # | Rule |
|---|---|
| 1 | Every endpoint must have `@ApiOperation({ summary: '...' })` |
| 2 | Every GET endpoint must have `@ApiOkResponse` with a realistic example |
| 3 | Use `@ApiProperty({ example: ... })` on DTOs when available — examples must be real data, not generic `"string"` or `123` placeholders |
| 4 | If there is no response DTO yet → use `@ApiOkResponse({ schema: { example: { ... } } })` directly on the endpoint |
| 5 | Every query param must have `@ApiQuery({ name, required, description, example })` for each field |
| 6 | Every route param must have `@ApiParam({ name, example })` — e.g. `@ApiParam({ name: 'id', example: 1 })` |
| 7 | No response may be left without a description — every `@ApiResponse` must have a clear `description` |

### 2. ApiTags naming (CRITICAL)

| Controller type | Pattern | Example |
|---|---|---|
| Public controller | `@ApiTags('ModuleName')` | `@ApiTags('Products')` |
| Admin controller | `@ApiTags('Admin — ModuleName')` | `@ApiTags('Admin — Products')` |

**Use an em-dash (`—`) between `Admin` and the module name — do NOT use a hyphen (`-`).**

```typescript
// ✓ CORRECT
@ApiTags('Admin — Products')
@ApiTags('Admin — Inventory')
@ApiTags('Admin — Customers')

// ✗ WRONG — breaks Swagger grouping
@ApiTags('Admin - Products')
@ApiTags('admin/inventory')
@ApiTags('inventory')
```

### 3. Required decorator structure by endpoint type

**GET list (returns array, has QueryDto):**
```typescript
@Get()
@ApiOperation({ summary: 'Danh sách sản phẩm (filter / paginate)' })
@ApiQuery({ name: 'q', required: false, description: 'Tìm theo tên', example: 'Core i9' })
@ApiQuery({ name: 'page', required: false, description: 'Trang', example: 1 })
@ApiQuery({ name: 'limit', required: false, description: 'Số item/trang', example: 20 })
@ApiOkResponse({
  schema: {
    example: {
      items: [{ id: 1, name: 'Intel Core i9-14900K', slug: 'intel-core-i9-14900k' }],
      total: 42,
      page: 1,
      limit: 20,
    },
  },
})
findAll(@Query() query: QueryProductDto) { ... }
```

**GET detail with id/slug param:**
```typescript
@Get(':slug')
@ApiOperation({ summary: 'Chi tiết sản phẩm theo slug' })
@ApiParam({ name: 'slug', example: 'intel-core-i9-14900k' })
@ApiOkResponse({
  schema: {
    example: { id: 1, name: 'Intel Core i9-14900K', price: 15000000, status: 'DangBan' },
  },
})
@ApiResponse({ status: 404, description: 'Sản phẩm không tồn tại' })
findBySlug(@Param('slug') slug: string) { ... }
```

**Admin GET (add 401/403):**
```typescript
@Get()
@ApiOperation({ summary: 'Danh sách tất cả đơn hàng (admin)' })
@ApiOkResponse({ schema: { example: { items: [...], total: 100, page: 1, limit: 20 } } })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
findAll() { ... }
```

**Auth-required GET (ApiBearerAuth at class level, add 401):**
```typescript
@Get('me')
@ApiOperation({ summary: 'Thông tin profile của tôi' })
@ApiOkResponse({ schema: { example: { id: 5, fullName: 'Nguyễn Văn A', email: 'a@example.com' } } })
@ApiResponse({ status: 401, description: 'Unauthorized' })
getProfile() { ... }
```

### 4. Required Swagger imports

```typescript
import {
  ApiTags, ApiOperation, ApiOkResponse, ApiResponse,
  ApiBearerAuth, ApiParam, ApiQuery, ApiBody,
} from '@nestjs/swagger';
```

---

### 5. Language rule: Vietnamese vs English

| Location | Language | Reason |
|---|---|---|
| `@ApiOperation({ summary })` | **Vietnamese** | Shown in Swagger UI — read by devs/testers |
| `@ApiResponse({ description })` | **Vietnamese** | Shown in Swagger UI |
| `@ApiQuery({ description })` | **Vietnamese** | Shown in Swagger UI |
| `@ApiParam({ description })` | **Vietnamese** | Shown in Swagger UI |
| `@ApiOkResponse` / `schema.example` values | **Vietnamese where applicable** | Real data, may contain Vietnamese strings |
| Code comments (`//`) | **English** | Read by AI agents and developers |
| CONVENTIONS.md guide text & headings | **English** | AI-facing instructions |
| Code block labels in docs | **English** | Consistent with tooling |

**Examples — correct usage:**

```typescript
// ✓ CORRECT — summary and descriptions in Vietnamese
@ApiOperation({ summary: 'Chi tiết sản phẩm theo slug' })
@ApiParam({ name: 'slug', description: 'Slug của sản phẩm', example: 'intel-core-i9-14900k' })
@ApiResponse({ status: 404, description: 'Sản phẩm không tồn tại' })

// ✓ CORRECT — code comments in English
// Slug is used instead of id to keep URLs SEO-friendly
findBySlug(@Param('slug') slug: string) { ... }
```

```typescript
// ✗ WRONG — summary in English
@ApiOperation({ summary: 'Get product detail by slug' })

// ✗ WRONG — code comment in Vietnamese
// Dùng slug thay vì id để URL thân thiện với SEO
```

> **Rule of thumb:** if it appears in the Swagger UI (user/tester sees it) → Vietnamese. If it appears only in source code (AI/developer reads it) → English.

---

### 6. `addTag` registration in `main.ts` (REQUIRED)

Every `@ApiTags('...')` used in any controller **must** have a matching `.addTag(name, description)` call in the `DocumentBuilder` block inside `src/main.ts`. Without it the tag appears in Swagger UI with no description and may be sorted arbitrarily.

**Rules:**
1. Add both the public tag and the admin tag for each module.
2. Order: public tag first, then `Admin — <Module>` tag immediately below it.
3. Description must be in Vietnamese (shown in Swagger UI).
4. Keep the list ordered by build phase, then alphabetically within a phase.

**Pattern:**
```typescript
// src/main.ts — DocumentBuilder block
const swaggerConfig = new DocumentBuilder()
  // ...
  .addTag('Products', 'Sản phẩm & biến thể')
  .addTag('Admin — Products', 'Quản lý sản phẩm & biến thể (admin)')
  .addTag('Flash Sales', 'Flash sale đang diễn ra')
  .addTag('Admin — Flash Sales', 'Quản lý flash sales (admin)')
  // ...
  .build();
```

**Checklist — add a tag pair when:**
- [ ] A new module folder is created under `src/modules/`
- [ ] A new `@ApiTags('...')` value appears that is not yet listed in `main.ts`

**Current registered tags** (update this list whenever `main.ts` changes):

| Tag | Mô tả |
|---|---|
| `Auth` | Xác thực & phân quyền |
| `Users` | Quản lý tài khoản khách hàng |
| `Admin — Customers` | Quản lý tài khoản khách hàng (admin) |
| `Admin — Employees` | Quản lý nhân viên |
| `Admin — Roles` | Quản lý vai trò & phân quyền |
| `Admin — Permissions` | Quản lý quyền hạn |
| `Categories` | Danh mục sản phẩm |
| `Admin — Categories` | Quản lý danh mục sản phẩm (admin) |
| `Brands` | Thương hiệu sản phẩm |
| `Admin — Brands` | Quản lý thương hiệu (admin) |
| `Specifications` | Thông số kỹ thuật |
| `Admin — Specifications` | Quản lý thông số kỹ thuật (admin) |
| `Products` | Sản phẩm & biến thể |
| `Admin — Products` | Quản lý sản phẩm & biến thể (admin) |
| `Media` | Thư viện media |
| `Admin — Media` | Quản lý thư viện media (admin) |
| `BuildPC` | Xây dựng cấu hình PC |
| `Admin — BuildPC` | Quản lý cấu hình PC (admin) |
| `Cart` | Giỏ hàng |
| `Orders` | Đơn hàng |
| `Admin — Orders` | Quản lý đơn hàng (admin) |
| `Payments` | Thanh toán |
| `Inventory` | Tồn kho |
| `Admin — Inventory` | Quản lý kho hàng (admin) |
| `Suppliers` | Nhà cung cấp |
| `Admin — Suppliers` | Quản lý nhà cung cấp (admin) |
| `Promotions` | Khuyến mãi |
| `Admin — Promotions` | Quản lý khuyến mãi (admin) |
| `Flash Sales` | Flash sale đang diễn ra |
| `Admin — Flash Sales` | Quản lý flash sale (admin) |
| `Loyalty` | Điểm tích lũy |
| `Admin — Loyalty` | Quản lý điểm tích lũy (admin) |
| `Reviews` | Đánh giá sản phẩm |
| `Admin — Reviews` | Kiểm duyệt đánh giá sản phẩm (admin) |
| `Returns` | Yêu cầu đổi/trả hàng |
| `Admin — Returns` | Quản lý yêu cầu đổi/trả (admin) |
| `Support` | Ticket hỗ trợ khách hàng |
| `Admin — Support` | Quản lý ticket hỗ trợ (admin) |
| `Notifications` | Thông báo cá nhân |
| `Admin — Notifications` | Quản lý cấu hình thông báo tự động (admin) |
| `Wishlist` | Danh sách sản phẩm yêu thích |
| `Search` | Tìm kiếm & gợi ý sản phẩm |
| `CMS` | Nội dung trang web (banners, pages, FAQ, menus, popups) |
| `Admin — CMS` | Quản lý nội dung trang web (admin) |
| `Admin — Reports` | Báo cáo kinh doanh & phân tích (admin) |
| `Settings` | Cấu hình hệ thống công khai |
| `Admin — Settings` | Quản lý cấu hình hệ thống (admin) |

> When adding a new module (Phase 9+), append the tag pair here and in `src/main.ts` before shipping.
