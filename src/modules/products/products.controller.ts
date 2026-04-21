import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ProductsService } from './products.service';
import { ProductsSearchService } from './products-search.service';
import { SpecificationsService } from '../specifications/specifications.service';
import { QueryProductDto } from './dto/query-product.dto';

@ApiTags('Products')
@Public()
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly searchService: ProductsSearchService,
    private readonly specsService: SpecificationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách sản phẩm (filter / paginate)' })
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
            thumbnail: 'https://res.cloudinary.com/demo/image/upload/rog-rtx4070.jpg',
            minPrice: 18500000,
            maxPrice: 22000000,
            brand: { id: 2, name: 'ASUS' },
            category: { id: 3, name: 'Card màn hình' },
            defaultVariant: { id: 5, sku: 'ROG-RTX4070-12G', price: 20500000, stock: 14 },
          },
        ],
        total: 84,
        page: 1,
        limit: 20,
        totalPages: 5,
      },
    },
  })
  findAll(@Query() query: QueryProductDto) {
    return this.searchService.findAll(query);
  }

  @Get(':id/specs')
  @ApiOperation({ summary: 'Thông số kỹ thuật theo phiên bản sản phẩm (variantId)' })
  @ApiParam({ name: 'id', description: 'ID của biến thể sản phẩm (variantId)', example: 5 })
  @ApiOkResponse({
    schema: {
      example: [
        {
          groupName: 'Thông số GPU',
          specs: [
            { name: 'Chip đồ họa', value: 'NVIDIA GeForce RTX 4070' },
            { name: 'Bộ nhớ VRAM', value: '12 GB GDDR6X' },
            { name: 'Tốc độ xung nhịp', value: '2475 MHz (Boost)' },
            { name: 'Giao diện kết nối', value: 'PCIe 4.0 x16' },
          ],
        },
        {
          groupName: 'Cổng kết nối',
          specs: [
            { name: 'HDMI', value: '2x HDMI 2.1' },
            { name: 'DisplayPort', value: '3x DisplayPort 1.4a' },
          ],
        },
      ],
    },
  })
  @ApiResponse({ status: 404, description: 'Biến thể sản phẩm không tồn tại' })
  findSpecsByVariant(@Param('id', ParseIntPipe) id: number) {
    return this.specsService.findValuesByVariant(id);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Chi tiết sản phẩm theo slug' })
  @ApiParam({ name: 'slug', description: 'Slug của sản phẩm', example: 'asus-rog-strix-rtx-4070' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 1,
        name: 'ASUS ROG Strix GeForce RTX 4070',
        slug: 'asus-rog-strix-rtx-4070',
        description: 'Card màn hình cao cấp dòng ROG với VRAM 12GB GDDR6X, hiệu năng vượt trội cho gaming 1440p.',
        brand: { id: 2, name: 'ASUS', logo: 'https://res.cloudinary.com/demo/image/upload/asus-logo.png' },
        category: { id: 3, name: 'Card màn hình', slug: 'card-man-hinh' },
        variants: [
          {
            id: 5,
            sku: 'ROG-RTX4070-12G',
            name: 'RTX 4070 12GB',
            price: 20500000,
            stock: 14,
            isDefault: true,
            images: ['https://res.cloudinary.com/demo/image/upload/rog-rtx4070-1.jpg'],
          },
        ],
        createdAt: '2024-01-15T08:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Sản phẩm không tồn tại' })
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }
}
