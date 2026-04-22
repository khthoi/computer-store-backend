import {
  Controller, Get, Post, Delete, Body, Param, ParseIntPipe, Request,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiBearerAuth,
} from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { AddItemDto } from './dto/add-item.dto';

@ApiTags('Wishlist')
@ApiBearerAuth('access-token')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách yêu thích kèm tình trạng tồn kho' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 1,
        items: [
          {
            id: 5, variantId: 12, addedAt: '2024-06-01T10:00:00.000Z',
            variant: {
              phien_ban_id: 12, ten_phien_ban: 'Intel Core i9-14900K',
              gia_ban: '12990000.00', trang_thai: 'HienThi',
              ten_san_pham: 'CPU Intel Core i9', slug: 'cpu-intel-core-i9',
              stock: 15,
            },
          },
        ],
      },
    },
  })
  getWishlist(@Request() req) {
    return this.wishlistService.getWishlist(req.user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Thêm sản phẩm vào danh sách yêu thích' })
  @ApiResponse({ status: 201, description: 'Thêm thành công' })
  @ApiResponse({ status: 409, description: 'Sản phẩm đã có trong danh sách' })
  addItem(@Body() dto: AddItemDto, @Request() req) {
    return this.wishlistService.addItem(req.user.id, dto.variantId);
  }

  @Delete('items/:variantId')
  @ApiOperation({ summary: 'Xóa sản phẩm khỏi danh sách yêu thích' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  removeItem(@Param('variantId', ParseIntPipe) variantId: number, @Request() req) {
    return this.wishlistService.removeItem(req.user.id, variantId);
  }
}
