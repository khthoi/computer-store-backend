import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@ApiTags('Admin — Suppliers')
@ApiBearerAuth('access-token')
@Controller('admin/suppliers')
@Roles('admin', 'warehouse')
export class AdminSuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách tất cả nhà cung cấp' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, tenNhaCungCap: 'Intel Vietnam Co. Ltd', email: 'supply@intel.vn', soDienThoai: '0284123456', diaChi: '12 Nguyễn Huệ, Q.1, TP.HCM', nguoiLienHe: 'Nguyễn Văn A', trangThai: 'DangHopTac' },
        { id: 2, tenNhaCungCap: 'Samsung Display Vietnam', email: 'biz@samsung.vn', soDienThoai: '0241987654', diaChi: 'KCN Yên Phong, Bắc Ninh', nguoiLienHe: 'Trần Thị B', trangThai: 'DangHopTac' },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết nhà cung cấp theo ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    schema: {
      example: { id: 1, tenNhaCungCap: 'Intel Vietnam Co. Ltd', email: 'supply@intel.vn', soDienThoai: '0284123456', diaChi: '12 Nguyễn Huệ, Q.1, TP.HCM', nguoiLienHe: 'Nguyễn Văn A', trangThai: 'DangHopTac' },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Nhà cung cấp không tồn tại' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo nhà cung cấp mới' })
  @ApiResponse({ status: 201, description: 'Nhà cung cấp đã được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  create(@Body() dto: CreateSupplierDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin nhà cung cấp' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Thông tin nhà cung cấp đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Nhà cung cấp không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSupplierDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá nhà cung cấp' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Nhà cung cấp đã được xoá' })
  @ApiResponse({ status: 404, description: 'Nhà cung cấp không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
