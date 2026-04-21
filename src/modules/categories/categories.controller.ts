import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CategoriesService } from './categories.service';

@ApiTags('Categories')
@Public()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Cây danh mục (đệ quy)' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          name: 'Linh kiện máy tính',
          slug: 'linh-kien-may-tinh',
          icon: 'cpu',
          children: [
            {
              id: 3,
              name: 'Card màn hình',
              slug: 'card-man-hinh',
              icon: 'gpu',
              children: [],
            },
            {
              id: 4,
              name: 'CPU / Bộ xử lý',
              slug: 'cpu-bo-xu-ly',
              icon: 'chip',
              children: [],
            },
          ],
        },
        {
          id: 2,
          name: 'Laptop',
          slug: 'laptop',
          icon: 'laptop',
          children: [
            {
              id: 5,
              name: 'Laptop Gaming',
              slug: 'laptop-gaming',
              icon: 'gamepad',
              children: [],
            },
          ],
        },
      ],
    },
  })
  getTree() {
    return this.categoriesService.getTree();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Danh mục theo slug' })
  @ApiParam({ name: 'slug', description: 'Slug của danh mục', example: 'card-man-hinh' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 3,
        name: 'Card màn hình',
        slug: 'card-man-hinh',
        description: 'Card đồ họa rời cho PC và workstation',
        icon: 'gpu',
        parent: { id: 1, name: 'Linh kiện máy tính', slug: 'linh-kien-may-tinh' },
        children: [],
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Danh mục không tồn tại' })
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }
}
