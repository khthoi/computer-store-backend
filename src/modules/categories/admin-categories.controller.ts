import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin — Categories')
@ApiBearerAuth('access-token')
@Roles('admin', 'staff')
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách tất cả danh mục (flat list)' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          name: 'Linh kiện máy tính',
          slug: 'linh-kien-may-tinh',
          parentId: null,
          icon: 'cpu',
          isVisible: true,
          productCount: 120,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 3,
          name: 'Card màn hình',
          slug: 'card-man-hinh',
          parentId: 1,
          icon: 'gpu',
          isVisible: true,
          productCount: 45,
          createdAt: '2024-01-02T00:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết danh mục' })
  @ApiParam({ name: 'id', description: 'ID của danh mục', example: 3 })
  @ApiOkResponse({
    schema: {
      example: {
        id: 3,
        name: 'Card màn hình',
        slug: 'card-man-hinh',
        description: 'Card đồ họa rời cho PC và workstation',
        icon: 'gpu',
        parentId: 1,
        parent: { id: 1, name: 'Linh kiện máy tính' },
        isVisible: true,
        displayOrder: 2,
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-03-10T14:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Danh mục không tồn tại' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo danh mục mới' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật danh mục' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá danh mục (không có con, không có sản phẩm)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}
