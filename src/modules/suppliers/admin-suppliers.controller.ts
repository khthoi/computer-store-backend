import { Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { SupplierResponseDto, PaginatedSuppliersDto } from './dto/supplier-response.dto';

@ApiTags('Admin — Suppliers')
@ApiBearerAuth('access-token')
@Controller('admin/suppliers')
@Roles('admin', 'warehouse')
export class AdminSuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách nhà cung cấp (phân trang, tìm kiếm, lọc, sắp xếp)' })
  @ApiOkResponse({ type: PaginatedSuppliersDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAll(@Query() query: QuerySupplierDto): Promise<PaginatedSuppliersDto> {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết nhà cung cấp theo ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: SupplierResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Nhà cung cấp không tồn tại' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<SupplierResponseDto> {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo nhà cung cấp mới' })
  @ApiResponse({ status: 201, type: SupplierResponseDto, description: 'Nhà cung cấp đã được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  create(@Body() dto: CreateSupplierDto): Promise<SupplierResponseDto> {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin nhà cung cấp' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: SupplierResponseDto })
  @ApiResponse({ status: 404, description: 'Nhà cung cấp không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSupplierDto): Promise<SupplierResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá nhà cung cấp (soft delete — chuyển sang Ngưng hợp tác)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Nhà cung cấp đã được xoá' })
  @ApiResponse({ status: 404, description: 'Nhà cung cấp không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }
}
