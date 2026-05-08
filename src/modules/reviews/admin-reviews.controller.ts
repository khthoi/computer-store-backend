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
import { BulkModerateDto } from './dto/bulk-moderate.dto';

@ApiTags('Admin — Reviews')
@ApiBearerAuth()
@Controller('admin/reviews')
@Roles('admin', 'staff')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách đánh giá (có thể lọc theo trạng thái, biến thể, tìm kiếm)' })
  @ApiQuery({ name: 'status', required: false, enum: ['Pending', 'Approved', 'Rejected', 'Hidden'] })
  @ApiQuery({ name: 'variantId', required: false, description: 'Lọc theo biến thể sản phẩm', example: 5 })
  @ApiQuery({ name: 'rating', required: false, description: 'Lọc theo số sao', example: 5 })
  @ApiQuery({ name: 'search', required: false, description: 'Tìm theo tên SP / KH / mã đơn' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'ISO date string (yyyy-mm-dd)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'ISO date string (yyyy-mm-dd)' })
  @ApiQuery({ name: 'chuaTraLoi', required: false, description: 'Chỉ lấy đánh giá Approved chưa được trả lời' })
  @ApiQuery({ name: 'nguon', required: false, enum: ['Website', 'App', 'Import'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAll(@Query() query: QueryReviewsDto) {
    return this.reviewsService.findAll(query);
  }

  // IMPORTANT: @Get('stats') must be declared BEFORE @Get(':id')
  @Get('stats')
  @ApiOperation({ summary: 'Thống kê tổng quan đánh giá' })
  @ApiOkResponse({
    schema: {
      example: { tong: 100, choDuyet: 10, daDuyet: 70, tuChoi: 5, an: 15, tbRating: 4.2, chuaTraLoi: 8 },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  getStats() {
    return this.reviewsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đánh giá kèm lịch sử phản hồi' })
  @ApiParam({ name: 'id', example: 1, description: 'ID đánh giá' })
  @ApiResponse({ status: 200, description: 'Chi tiết review + messages' })
  @ApiResponse({ status: 404, description: 'Đánh giá không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  getDetail(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.getDetail(id);
  }

  @Post('bulk-moderate')
  @ApiOperation({ summary: 'Duyệt/từ chối nhiều đánh giá cùng lúc' })
  @ApiResponse({ status: 201, description: 'Bulk moderation completed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  bulkModerate(@Body() dto: BulkModerateDto, @Request() req: any) {
    const employeeId = req.user?.employeeId ?? req.user?.sub;
    return this.reviewsService.bulkModerate(dto, employeeId);
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  getMessages(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.getMessages(id);
  }
}
