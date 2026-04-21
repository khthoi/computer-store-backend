import { Controller, Get, Put, Param, Query, Body, ParseIntPipe } from '@nestjs/common';
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
  @ApiParam({ name: 'id', example: 101 })
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
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: '[Admin] Cập nhật trạng thái đơn hàng' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('sub') adminId: number,
  ) {
    return this.ordersService.updateStatus(id, dto, adminId);
  }
}
