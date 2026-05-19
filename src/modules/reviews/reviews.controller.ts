import {
  Controller, Get, Post, Body, Param, ParseIntPipe, Request, Query,
  UploadedFiles, UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags, ApiOperation, ApiOkResponse, ApiResponse,
  ApiBearerAuth, ApiParam, ApiQuery, ApiConsumes, ApiBody,
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
  @ApiQuery({ name: 'rating', required: false, description: 'Lọc theo số sao (1-5)', example: 5 })
  @ApiQuery({ name: 'hasImages', required: false, description: 'Chỉ trả đánh giá có ảnh', example: true })
  @ApiQuery({ name: 'variantId', required: false, description: 'Lọc theo phiên bản sản phẩm', example: 5 })
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
    return this.reviewsService.getApprovedReviews(productId, query.page, query.limit, {
      rating: query.rating,
      hasImages: query.hasImages,
      variantId: query.variantId,
    });
  }

  @Post('reviews')
  @ApiOperation({ summary: 'Gửi đánh giá sản phẩm (chỉ khách đã mua & nhận hàng) — multipart/form-data với images[]' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        orderId: { type: 'integer', example: 12 },
        variantId: { type: 'integer', example: 5 },
        rating: { type: 'integer', minimum: 1, maximum: 5 },
        title: { type: 'string' },
        content: { type: 'string' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Tối đa 5 ảnh, mỗi ảnh ≤ 5MB',
        },
      },
      required: ['orderId', 'variantId', 'rating'],
    },
  })
  @ApiResponse({ status: 201, description: 'Đánh giá đã được gửi, chờ duyệt' })
  @ApiResponse({ status: 403, description: 'Chưa mua hoặc chưa nhận hàng thành công' })
  @ApiResponse({ status: 409, description: 'Đã đánh giá sản phẩm này cho đơn hàng này' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  submitReview(
    @Body() dto: CreateReviewDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Request() req: any,
  ) {
    return this.reviewsService.submitReview(dto, req.user.sub, files);
  }
}
