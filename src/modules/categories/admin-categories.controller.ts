import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin — Categories')
@ApiBearerAuth('access-token')
@Roles('admin', 'staff')
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách tất cả danh mục (flat list)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  async findAll(): Promise<CategoryResponseDto[]> {
    const [cats, countMap] = await Promise.all([
      this.categoriesService.findAll(),
      this.categoriesService.getProductCountMap(),
    ]);
    return cats.map((c) => CategoryResponseDto.from(c, countMap.get(c.id) ?? 0));
  }

  @Get('tree')
  @ApiOperation({ summary: 'Cây danh mục (nested tree)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  async getTree() {
    const [roots, countMap] = await Promise.all([
      this.categoriesService.getTree(),
      this.categoriesService.getProductCountMap(),
    ]);
    return roots.map((c) => CategoryResponseDto.fromTree(c, countMap));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết danh mục' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Danh mục không tồn tại' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<CategoryResponseDto> {
    const [cat, countMap] = await Promise.all([
      this.categoriesService.findOne(id),
      this.categoriesService.getProductCountMap(),
    ]);
    return CategoryResponseDto.from(cat, countMap.get(cat.id) ?? 0);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo danh mục mới' })
  async create(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const cat = await this.categoriesService.create(dto);
    return CategoryResponseDto.from(cat);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật danh mục' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const cat = await this.categoriesService.update(id, dto);
    return CategoryResponseDto.from(cat);
  }

  @Patch('reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Sắp xếp lại danh mục cùng cấp' })
  reorder(@Body() dto: { orderedIds: number[] }) {
    return this.categoriesService.reorderCategories(dto.orderedIds);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá danh mục (không có con, không có sản phẩm)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}
