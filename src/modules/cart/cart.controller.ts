import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiResponse } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy giỏ hàng của tôi' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 3,
        customerId: 5,
        items: [
          {
            id: 10,
            variantId: 20,
            productName: 'Intel Core i9-14900K',
            sku: 'CPU-I9-14900K',
            price: 15000000,
            quantity: 1,
            imageUrl: 'https://res.cloudinary.com/pc-store/image/upload/products/cpu-i9-14900k.jpg',
          },
        ],
        total: 15000000,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyCart(@CurrentUser('sub') userId: number) {
    return this.cartService.getMyCart(userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Thêm sản phẩm vào giỏ' })
  addItem(@CurrentUser('sub') userId: number, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(userId, dto);
  }

  @Put('items/:id')
  @ApiOperation({ summary: 'Cập nhật số lượng trong giỏ' })
  updateItem(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(userId, itemId, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Xoá sản phẩm khỏi giỏ' })
  removeItem(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) itemId: number,
  ) {
    return this.cartService.removeItem(userId, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Xoá toàn bộ giỏ hàng' })
  clearCart(@CurrentUser('sub') userId: number) {
    return this.cartService.clearCart(userId);
  }
}
