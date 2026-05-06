import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, ParseIntPipe, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { FlashSalesService } from './flash-sales.service';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto';
import { UpdateFlashSaleDto } from './dto/update-flash-sale.dto';
import { QueryFlashSaleDto } from './dto/query-flash-sale.dto';

@ApiTags('Admin — Flash Sales')
@Controller('admin/flash-sales')
@Roles('admin', 'staff')
@ApiBearerAuth()
export class AdminFlashSalesController {
  constructor(private readonly flashSalesService: FlashSalesService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê tổng quan flash sale' })
  @ApiOkResponse({ schema: { example: { totalEvents: 10, activeNow: 1, upcomingCount: 3, todayCount: 2 } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStats() {
    return this.flashSalesService.getStats();
  }

  @Get('search-variants')
  @ApiOperation({ summary: 'Tìm kiếm phiên bản sản phẩm để thêm vào flash sale' })
  @ApiQuery({ name: 'q', description: 'Từ khóa tìm kiếm (tên, SKU, tên sản phẩm)', example: 'i9' })
  @ApiQuery({ name: 'exclude', required: false, description: 'Danh sách phienBanId đã chọn (phân cách dấu phẩy)', example: '1,2,3' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  searchVariants(
    @Query('q') q = '',
    @Query('exclude') exclude?: string,
  ) {
    const excludeIds = exclude
      ? exclude.split(',').map(Number).filter((n) => !isNaN(n))
      : [];
    return this.flashSalesService.searchVariants(q, excludeIds);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách flash sales (phân trang, lọc theo status/search)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAll(@Query() query: QueryFlashSaleDto) {
    return this.flashSalesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết flash sale kèm items và thông tin phiên bản sản phẩm' })
  @ApiParam({ name: 'id', example: 5 })
  @ApiResponse({ status: 404, description: 'Flash sale không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.flashSalesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo flash sale mới kèm danh sách items' })
  @ApiResponse({ status: 201, description: 'Flash sale đã được tạo' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFlashSaleDto) {
    return this.flashSalesService.update(id, dto);
  }

  @Patch(':id/end')
  @ApiOperation({ summary: 'Kết thúc sớm flash sale (đặt trạng thái da_ket_thuc)' })
  @ApiParam({ name: 'id', example: 5 })
  @ApiResponse({ status: 200, description: 'Flash sale đã kết thúc sớm' })
  @ApiResponse({ status: 400, description: 'Flash sale đã kết thúc hoặc bị hủy' })
  @ApiResponse({ status: 404, description: 'Flash sale không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  endEarly(@Param('id', ParseIntPipe) id: number) {
    return this.flashSalesService.endEarly(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hủy flash sale (chuyển trạng thái sang huy)' })
  @ApiParam({ name: 'id', example: 5 })
  @ApiResponse({ status: 200, description: 'Flash sale đã bị hủy' })
  @ApiResponse({ status: 404, description: 'Flash sale không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.flashSalesService.cancel(id);
  }
}
