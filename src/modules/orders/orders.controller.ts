import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
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
import { CheckoutDto } from './dto/checkout.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Đặt hàng từ giỏ hàng' })
  checkout(@CurrentUser('sub') userId: number, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách đơn hàng của tôi' })
  @ApiQuery({ name: 'trangThai', required: false, example: 'DaGiao', description: 'Lọc theo trạng thái đơn hàng' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Trang hiện tại' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Số bản ghi mỗi trang' })
  @ApiOkResponse({
    schema: {
      example: {
        items: [
          {
            id: 101,
            orderCode: 'ORD-20240315-0001',
            status: 'DaGiao',
            totalAmount: 15500000,
            orderedAt: '2024-03-15T10:30:00.000Z',
          },
        ],
        total: 5,
        page: 1,
        limit: 20,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findMyOrders(@CurrentUser('sub') userId: number, @Query() query: QueryOrderDto) {
    return this.ordersService.findMyOrders(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đơn hàng' })
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
  @ApiResponse({ status: 404, description: 'Đơn hàng không tồn tại' })
  findOne(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.findOne(id, userId);
  }

  @Delete(':id/cancel')
  @ApiOperation({ summary: 'Hủy đơn hàng (chỉ khi Chờ xác nhận)' })
  cancelOrder(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.cancelOrder(id, userId);
  }
}
