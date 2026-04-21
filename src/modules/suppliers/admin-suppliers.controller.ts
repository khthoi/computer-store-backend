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
  @ApiOperation({ summary: 'List all suppliers' })
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
  @ApiOperation({ summary: 'Get supplier detail by ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    schema: {
      example: { id: 1, tenNhaCungCap: 'Intel Vietnam Co. Ltd', email: 'supply@intel.vn', soDienThoai: '0284123456', diaChi: '12 Nguyễn Huệ, Q.1, TP.HCM', nguoiLienHe: 'Nguyễn Văn A', trangThai: 'DangHopTac' },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new supplier' })
  create(@Body() dto: CreateSupplierDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update supplier information' })
  @ApiParam({ name: 'id', example: 1 })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSupplierDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a supplier' })
  @ApiParam({ name: 'id', example: 1 })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
