import {
  Controller, Get, Post, Body, Param, ParseIntPipe, Request, Query,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiOkResponse, ApiResponse,
  ApiBearerAuth, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';

@ApiTags('Reviews')
@ApiBearerAuth()
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('products/:productId/reviews')
  @Public()
  @ApiOperation({ summary: 'Danh sách đánh giá đã duyệt theo sản phẩm' })
  @ApiParam({ name: 'productId', example: 1, description: 'ID sản phẩm' })
  @ApiQuery({ name: 'page', required: false, description: 'Trang', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Số item/trang', example: 10 })
  @ApiOkResponse({
    schema: {
      example: {
        items: [
          {
            id: 1, variantId: 5, customerId: 3, rating: 5,
            title: 'Sản phẩm tuyệt vời', content: 'Giao hàng nhanh, đóng gói kỹ',
            status: 'Approved', hasReply: 1, helpfulCount: 2,
            createdAt: '2024-06-01T10:00:00.000Z',
          },
        ],
        total: 1, page: 1, limit: 10,
      },
    },
  })
  getApprovedReviews(
    @Param('productId', ParseIntPipe) productId: number,
    @Query() query: QueryReviewsDto,
  ) {
    return this.reviewsService.getApprovedReviews(productId, query.page, query.limit);
  }

  @Post('reviews')
  @ApiOperation({ summary: 'Gửi đánh giá sản phẩm (chỉ khách đã mua & nhận hàng)' })
  @ApiResponse({ status: 201, description: 'Đánh giá đã được gửi, chờ duyệt' })
  @ApiResponse({ status: 403, description: 'Chưa mua hoặc chưa nhận hàng thành công' })
  @ApiResponse({ status: 409, description: 'Đã đánh giá sản phẩm này cho đơn hàng này' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  submitReview(@Body() dto: CreateReviewDto, @Request() req: any) {
    return this.reviewsService.submitReview(dto, req.user.sub);
  }
}
