import { Controller, Get, Put, Patch, Post, Param, Query, Body, NotFoundException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { QueryOrderDto } from './dto/query-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderShippingDto } from './dto/update-order-shipping.dto';
import { AddOrderNoteDto } from './dto/add-order-note.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin — Orders')
@ApiBearerAuth()
@Roles('admin', 'staff')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách tất cả đơn hàng' })
  @ApiQuery({ name: 'trangThai', required: false, example: 'ChoTT', description: 'Lọc theo trạng thái đơn hàng' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Trang hiện tại' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Số bản ghi mỗi trang' })
  @ApiOkResponse({
    schema: {
      example: {
        items: [
          {
            id: 101,
            orderCode: 'ORD-20240315-0001',
            status: 'ChoTT',
            customer: { id: 5, fullName: 'Nguyễn Văn A' },
            totalAmount: 15500000,
          },
        ],
        total: 250,
        page: 1,
        limit: 20,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAll(@Query() query: QueryOrderDto) {
    return this.ordersService.findAllAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Chi tiết đơn hàng' })
  @ApiParam({ name: 'id', example: 'ORD-20240315-0001' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 101,
        orderCode: 'ORD-20240315-0001',
        status: 'DaGiao',
        totalAmount: 15500000,
        items: [
          {
            variantId: 20,
            productName: 'Intel Core i9-14900K',
            quantity: 1,
            price: 15000000,
          },
        ],
        shippingAddress: {
          fullName: 'Nguyễn Văn A',
          address: '123 Lê Lợi, Quận 1',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Đơn hàng không tồn tại' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOneAdmin(id);
  }

  @Get(':id/transaction')
  @ApiOperation({ summary: '[Admin] Thông tin giao dịch của đơn hàng' })
  @ApiParam({ name: 'id', example: 'ORD-20240315-0001' })
  @ApiResponse({ status: 200, description: 'Thông tin giao dịch' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giao dịch' })
  async findTransaction(@Param('id') id: string) {
    const tx = await this.ordersService.findTransactionByOrderCode(id);
    if (!tx) throw new NotFoundException('Không tìm thấy giao dịch');
    return tx;
  }

  @Put(':id/status')
  @ApiOperation({ summary: '[Admin] Cập nhật trạng thái đơn hàng' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('sub') adminId: number,
  ) {
    return this.ordersService.updateStatusAdmin(id, dto, adminId);
  }

  @Patch(':id/shipping')
  @ApiOperation({ summary: '[Admin] Cập nhật thông tin vận chuyển (carrier, tracking, estimated delivery)' })
  @ApiParam({ name: 'id', example: 'ORD-20240315-0001' })
  updateShipping(@Param('id') id: string, @Body() dto: UpdateOrderShippingDto) {
    return this.ordersService.updateShippingAdmin(id, dto);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: '[Admin] Thêm ghi chú nội bộ cho đơn hàng' })
  @ApiParam({ name: 'id', example: 'ORD-20240315-0001' })
  addNote(
    @Param('id') id: string,
    @Body() dto: AddOrderNoteDto,
    @CurrentUser('sub') adminId: number,
  ) {
    return this.ordersService.addNoteAdmin(id, dto, adminId);
  }

  @Get(':id/return-requests')
  @ApiOperation({ summary: '[Admin] Danh sách yêu cầu đổi trả của đơn hàng' })
  @ApiParam({ name: 'id', example: 'ORD-20240315-0001' })
  getReturnRequests(@Param('id') id: string) {
    return this.ordersService.getReturnRequestsForOrder(id);
  }
}
