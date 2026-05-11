import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { QueryBrandDto } from './dto/query-brand.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin — Brands')
@ApiBearerAuth('access-token')
@Roles('admin', 'staff')
@Controller('admin/brands')
export class AdminBrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thương hiệu (có phân trang & tìm kiếm)' })
  @ApiQuery({ name: 'q', required: false, description: 'Tìm theo tên hoặc mô tả' })
  @ApiQuery({ name: 'active', required: false, description: 'Lọc theo trạng thái (true/false)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAll(@Query() query: QueryBrandDto) {
    return this.brandsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết thương hiệu' })
  @ApiParam({ name: 'id', description: 'ID của thương hiệu', example: 2 })
  @ApiOkResponse({
    schema: {
      example: {
        id: 2,
        name: 'ASUS',
        slug: 'asus',
        logo: 'https://res.cloudinary.com/demo/image/upload/brands/asus-logo.png',
        description: 'Thương hiệu công nghệ hàng đầu Đài Loan, nổi tiếng với dòng ROG Gaming.',
        isVisible: true,
        productCount: 74,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-03-15T09:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Thương hiệu không tồn tại' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.brandsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo thương hiệu' })
  create(@Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thương hiệu' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBrandDto) {
    return this.brandsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Ẩn / xoá thương hiệu' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.brandsService.remove(id);
  }
}
