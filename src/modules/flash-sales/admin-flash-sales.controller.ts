import {
  Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { FlashSalesService } from './flash-sales.service';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto';
import { UpdateFlashSaleDto } from './dto/update-flash-sale.dto';

@ApiTags('Admin — Flash Sales')
@Controller('admin/flash-sales')
@Roles('admin', 'staff')
@ApiBearerAuth()
export class AdminFlashSalesController {
  constructor(private readonly flashSalesService: FlashSalesService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách tất cả flash sales (mới nhất trước)' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 5, ten: 'Flash Sale Thứ 6', trangThai: 'sap_dien_ra', batDau: '2024-06-07T10:00:00.000Z', ketThuc: '2024-06-07T14:00:00.000Z', bannerTitle: 'Sale sốc thứ 6', bannerImageUrl: 'https://res.cloudinary.com/pc-store/image/upload/banners/fs5.jpg', createdBy: 2, items: [] },
        { id: 3, ten: 'Flash Sale Cuối Tuần', trangThai: 'da_ket_thuc', batDau: '2024-06-01T10:00:00.000Z', ketThuc: '2024-06-01T14:00:00.000Z', bannerTitle: null, bannerImageUrl: null, createdBy: 2, items: [] },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAll() {
    return this.flashSalesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết flash sale kèm toàn bộ items theo ID' })
  @ApiParam({ name: 'id', example: 5 })
  @ApiOkResponse({
    schema: {
      example: {
        id: 5,
        ten: 'Flash Sale Thứ 6',
        trangThai: 'sap_dien_ra',
        batDau: '2024-06-07T10:00:00.000Z',
        ketThuc: '2024-06-07T14:00:00.000Z',
        bannerTitle: 'Sale sốc thứ 6',
        bannerImageUrl: 'https://res.cloudinary.com/pc-store/image/upload/banners/fs5.jpg',
        createdBy: 2,
        items: [
          { id: 18, phienBanId: 55, giaFlash: 7990000, giaGocSnapshot: 9990000, soLuongGioiHan: 30, soLuongDaBan: 0, thuTuHienThi: 1 },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Flash sale không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.flashSalesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo flash sale mới kèm danh sách items' })
  @ApiResponse({ status: 201, description: 'Flash sale đã được tạo' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  create(@Body() dto: CreateFlashSaleDto, @Request() req: any) {
    return this.flashSalesService.create(dto, req.user?.employeeId ?? req.user?.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật flash sale (không cho sửa khi đang diễn ra)' })
  @ApiParam({ name: 'id', example: 5 })
  @ApiResponse({ status: 200, description: 'Flash sale đã được cập nhật' })
  @ApiResponse({ status: 400, description: 'Không thể sửa flash sale đang diễn ra' })
  @ApiResponse({ status: 404, description: 'Flash sale không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFlashSaleDto) {
    return this.flashSalesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hủy flash sale (chuyển trạng thái sang huy)' })
  @ApiParam({ name: 'id', example: 5 })
  @ApiResponse({ status: 200, description: 'Flash sale đã bị hủy' })
  @ApiResponse({ status: 404, description: 'Flash sale không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.flashSalesService.cancel(id);
  }
}
