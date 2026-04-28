import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductsSearchService } from './products-search.service';
import { SpecificationsService } from '../specifications/specifications.service';
import { CreateProductDto, CreateVariantDto } from './dto/create-product.dto';
import { UpdateProductDto, UpdateVariantDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { SaveSpecValuesDto } from '../specifications/dto/save-spec-values.dto';
import { SaveVariantMediaDto } from './dto/save-variant-media.dto';
import { mapVariantAdminDetail, mapImageToMedia } from './dto/product-response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Admin — Products')
@ApiBearerAuth('access-token')
@Roles('admin', 'staff')
@Controller('admin/products')
export class AdminProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly searchService: ProductsSearchService,
    private readonly specsService: SpecificationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách sản phẩm (admin, bao gồm bản nháp)' })
  @ApiQuery({ name: 'q', required: false, example: 'RTX 4070', description: 'Tìm kiếm theo tên' })
  @ApiQuery({ name: 'categoryId', required: false, example: 3, description: 'Lọc theo danh mục' })
  @ApiQuery({ name: 'brandId', required: false, example: 2, description: 'Lọc theo thương hiệu' })
  @ApiQuery({ name: 'minPrice', required: false, example: 5000000, description: 'Giá tối thiểu (VND)' })
  @ApiQuery({ name: 'maxPrice', required: false, example: 50000000, description: 'Giá tối đa (VND)' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Số trang (mặc định 1)' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Số bản ghi mỗi trang (mặc định 20)' })
  @ApiQuery({ name: 'sortBy', required: false, example: 'createdAt', description: 'Trường sắp xếp (mặc định createdAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, example: 'DESC', description: 'Chiều sắp xếp: ASC | DESC (mặc định DESC)' })
  @ApiOkResponse({
    schema: {
      example: {
        data: [
          {
            id: 1,
            name: 'ASUS ROG Strix GeForce RTX 4070',
            slug: 'asus-rog-strix-rtx-4070',
            status: 'DangBan',
            brand: { id: 2, name: 'ASUS' },
            category: { id: 3, name: 'Card màn hình' },
            variantCount: 2,
            minPrice: 18500000,
            maxPrice: 22000000,
            totalStock: 28,
            createdAt: '2024-01-15T08:00:00.000Z',
          },
          {
            id: 2,
            name: 'Intel Core i9-14900K',
            slug: 'intel-core-i9-14900k',
            status: 'NhapKho',
            brand: { id: 1, name: 'Intel' },
            category: { id: 4, name: 'CPU / Bộ xử lý' },
            variantCount: 1,
            minPrice: 14900000,
            maxPrice: 14900000,
            totalStock: 0,
            createdAt: '2024-02-01T10:00:00.000Z',
          },
        ],
        total: 156,
        page: 1,
        limit: 20,
        totalPages: 8,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAll(@Query() query: QueryProductDto) {
    return this.searchService.findAll(query);
  }

  @Get(':productId/variants/:variantId')
  @ApiOperation({ summary: 'Chi tiết đầy đủ một biến thể (bao gồm thông số kỹ thuật và media)' })
  async findVariantAdmin(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('variantId', ParseIntPipe) variantId: number,
  ) {
    const [variant, categoryId] = await Promise.all([
      this.productsService.findVariantWithImages(productId, variantId),
      this.productsService.findProductCategoryId(productId),
    ]);
    const specGroups = await this.specsService.getSpecGroupsForVariantMerged(variantId, categoryId);
    return mapVariantAdminDetail(variant, specGroups);
  }

  @Get('variants/:variantId/images')
  @ApiOperation({ summary: 'Danh sách hình ảnh của biến thể' })
  async findVariantImages(@Param('variantId', ParseIntPipe) variantId: number) {
    const images = await this.productsService.findVariantImages(variantId);
    return images.map(mapImageToMedia);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết sản phẩm theo ID' })
  @ApiParam({ name: 'id', description: 'ID của sản phẩm', example: 1 })
  @ApiOkResponse({
    schema: {
      example: {
        id: 1,
        name: 'ASUS ROG Strix GeForce RTX 4070',
        slug: 'asus-rog-strix-rtx-4070',
        description: 'Card màn hình cao cấp dòng ROG với VRAM 12GB GDDR6X.',
        status: 'DangBan',
        brand: { id: 2, name: 'ASUS' },
        category: { id: 3, name: 'Card màn hình' },
        variants: [
          {
            id: 5,
            sku: 'ROG-RTX4070-12G',
            name: 'RTX 4070 12GB',
            price: 20500000,
            stock: 14,
            isDefault: true,
          },
          {
            id: 6,
            sku: 'ROG-RTX4070-OC',
            name: 'RTX 4070 OC Edition',
            price: 22000000,
            stock: 14,
            isDefault: false,
          },
        ],
        createdAt: '2024-01-15T08:00:00.000Z',
        updatedAt: '2024-03-20T11:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Sản phẩm không tồn tại' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOneAdmin(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo sản phẩm mới' })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: JwtPayload) {
    return this.productsService.create(dto, user.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật sản phẩm' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  // ── Variant-level routes (defined before :id to avoid NestJS shadowing) ───

  @Delete('variants/:variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá vĩnh viễn biến thể' })
  removeVariant(@Param('variantId', ParseIntPipe) variantId: number) {
    return this.productsService.removeVariant(variantId);
  }

  @Put('variants/:variantId')
  @ApiOperation({ summary: 'Cập nhật biến thể' })
  updateVariant(@Param('variantId', ParseIntPipe) variantId: number, @Body() dto: UpdateVariantDto) {
    return this.productsService.updateVariant(variantId, dto);
  }

  // ── Product-level routes ──────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá vĩnh viễn sản phẩm và tất cả biến thể' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Nhân bản sản phẩm (tạo bản sao trạng thái Nhap)' })
  cloneProduct(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.productsService.cloneProduct(id, user.sub);
  }

  @Post(':productId/variants/:variantId/clone')
  @ApiOperation({ summary: 'Nhân bản biến thể (tạo bản sao trạng thái An)' })
  cloneVariant(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('variantId', ParseIntPipe) variantId: number,
  ) {
    return this.productsService.cloneVariant(productId, variantId);
  }

  @Post(':id/variants')
  @ApiOperation({ summary: 'Thêm biến thể cho sản phẩm' })
  addVariant(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateVariantDto) {
    return this.productsService.addVariant(id, dto);
  }

  @Patch(':id/variants/:variantId/set-default')
  @ApiOperation({ summary: 'Đặt biến thể làm mặc định hiển thị trên listing/card' })
  setDefaultVariant(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
  ) {
    return this.productsService.setDefaultVariant(id, variantId);
  }

  // ── Spec Values ───────────────────────────────────────────────────────────

  @Put(':id/variants/:variantId/specs')
  @ApiOperation({ summary: 'Lưu thông số kỹ thuật cho biến thể (replace all)' })
  saveSpecValues(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: SaveSpecValuesDto,
  ) {
    return this.specsService.saveSpecValues(variantId, dto);
  }

  // ── Media ─────────────────────────────────────────────────────────────────

  @Put(':productId/variants/:variantId/media')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Lưu danh sách media cho biến thể (replace all)' })
  async saveVariantMedia(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: SaveVariantMediaDto,
  ) {
    return this.productsService.saveVariantMedia(variantId, dto.media);
  }
}
