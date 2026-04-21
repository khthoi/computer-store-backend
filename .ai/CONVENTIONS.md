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

### Variables & Properties — camelCase (English)
```typescript
const categoryId = 1;               ✓
const danh_muc_id = 1;             ✗

this.productService.findAll()       ✓
this.san_pham_service.findAll()     ✗
```

### DB Column Mapping — Vietnamese ERD → English property
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
