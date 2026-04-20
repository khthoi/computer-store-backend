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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
  findMyOrders(@CurrentUser('sub') userId: number, @Query() query: QueryOrderDto) {
    return this.ordersService.findMyOrders(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đơn hàng' })
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
