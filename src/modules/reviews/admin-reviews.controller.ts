import {
  Controller, Get, Post, Put, Body, Param, ParseIntPipe, Request, Query,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiOkResponse, ApiResponse,
  ApiBearerAuth, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReviewsService } from './reviews.service';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';

@ApiTags('Admin — Reviews')
@ApiBearerAuth()
@Controller('admin/reviews')
@Roles('admin', 'staff')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách đánh giá (có thể lọc theo trạng thái, biến thể)' })
  @ApiQuery({ name: 'status', required: false, enum: ['Pending', 'Approved', 'Rejected', 'Hidden'], description: 'Lọc theo trạng thái' })
  @ApiQuery({ name: 'variantId', required: false, description: 'Lọc theo biến thể sản phẩm', example: 5 })
  @ApiQuery({ name: 'page', required: false, description: 'Trang', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Số item/trang', example: 20 })
  @ApiOkResponse({
    schema: {
      example: {
        items: [
          {
            id: 1, variantId: 5, customerId: 3, rating: 5,
            title: 'Tốt lắm', content: 'Hàng đẹp, giao đúng hẹn', status: 'Pending',
            hasReply: 0, createdAt: '2024-06-01T10:00:00.000Z',
          },
        ],
        total: 1, page: 1, limit: 20,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAll(@Query() query: QueryReviewsDto) {
    return this.reviewsService.findAll(query);
  }

  @Put(':id/approve')
  @ApiOperation({ summary: 'Duyệt đánh giá — cập nhật điểm trung bình sản phẩm' })
  @ApiParam({ name: 'id', example: 1, description: 'ID đánh giá' })
  @ApiResponse({ status: 200, description: 'Đánh giá đã được duyệt' })
  @ApiResponse({ status: 400, description: 'Đánh giá đã được duyệt trước đó' })
  @ApiResponse({ status: 404, description: 'Đánh giá không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  approve(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const employeeId = req.user?.employeeId ?? req.user?.sub;
    return this.reviewsService.approveReview(id, employeeId);
  }

  @Put(':id/reject')
  @ApiOperation({ summary: 'Từ chối đánh giá — ghi lý do' })
  @ApiParam({ name: 'id', example: 1, description: 'ID đánh giá' })
  @ApiResponse({ status: 200, description: 'Đánh giá đã bị từ chối' })
  @ApiResponse({ status: 404, description: 'Đánh giá không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModerateReviewDto,
    @Request() req: any,
  ) {
    const employeeId = req.user?.employeeId ?? req.user?.sub;
    return this.reviewsService.rejectReview(id, dto, employeeId);
  }

  @Put(':id/hide')
  @ApiOperation({ summary: 'Ẩn đánh giá — giữ trong DB nhưng không hiển thị' })
  @ApiParam({ name: 'id', example: 1, description: 'ID đánh giá' })
  @ApiResponse({ status: 200, description: 'Đánh giá đã bị ẩn' })
  @ApiResponse({ status: 404, description: 'Đánh giá không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  hide(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModerateReviewDto,
    @Request() req: any,
  ) {
    const employeeId = req.user?.employeeId ?? req.user?.sub;
    return this.reviewsService.hideReview(id, dto, employeeId);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Phản hồi đánh giá (Reply hiển thị với khách; InternalNote chỉ nội bộ)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID đánh giá' })
  @ApiResponse({ status: 201, description: 'Phản hồi đã được gửi' })
  @ApiResponse({ status: 404, description: 'Đánh giá không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  reply(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplyReviewDto,
    @Request() req: any,
  ) {
    const employeeId = req.user?.employeeId ?? req.user?.sub;
    return this.reviewsService.replyToReview(id, dto, employeeId);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Lịch sử phản hồi của một đánh giá (bao gồm InternalNote)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID đánh giá' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1, reviewId: 1, senderType: 'NhanVien', senderId: 2,
          content: 'Cảm ơn bạn đã đánh giá!', messageType: 'Reply',
          isVisibleToCustomer: 1, createdAt: '2024-06-02T09:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  getMessages(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.getMessages(id);
  }
}
