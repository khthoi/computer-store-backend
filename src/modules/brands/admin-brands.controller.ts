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
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin — Brands')
@ApiBearerAuth('access-token')
@Roles('admin', 'staff')
@Controller('admin/brands')
export class AdminBrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thương hiệu' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          name: 'Intel',
          slug: 'intel',
          logo: 'https://res.cloudinary.com/demo/image/upload/brands/intel-logo.png',
          isVisible: true,
          productCount: 38,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 2,
          name: 'ASUS',
          slug: 'asus',
          logo: 'https://res.cloudinary.com/demo/image/upload/brands/asus-logo.png',
          isVisible: true,
          productCount: 74,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAll() {
    return this.brandsService.findAll();
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
