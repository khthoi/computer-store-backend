import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, ParseIntPipe, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiQuery, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { QueryPromotionDto } from './dto/query-promotion.dto';
import { SetPromotionStatusDto } from './dto/set-promotion-status.dto';

@ApiTags('Admin — Promotions')
@Controller('admin/promotions')
@Roles('admin', 'staff')
@ApiBearerAuth()
export class AdminPromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách promotions (lọc theo status/type/search/isCoupon, có phân trang)' })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'active', 'scheduled', 'paused', 'ended', 'cancelled'] })
  @ApiQuery({ name: 'type', required: false, enum: ['standard', 'bxgy', 'bundle', 'bulk', 'free_shipping'] })
  @ApiQuery({ name: 'search', required: false, description: 'Tìm theo tên promotion' })
  @ApiQuery({ name: 'isCoupon', required: false, description: 'true = chỉ coupon, false = chỉ auto-apply' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAll(@Query() query: QueryPromotionDto) {
    return this.promotionsService.findAll(query);
  }

  @Post('generate-code')
  @ApiOperation({ summary: 'Tạo mã giảm giá ngẫu nhiên (duy nhất, 10s cooldown per user)' })
  @ApiResponse({ status: 201, schema: { example: { code: 'ABC12345', cooldownMs: 10000 } } })
  @ApiResponse({ status: 409, description: 'Đang trong thời gian cooldown' })
  generateCode(@Request() req: any) {
    const userId = req.user?.employeeId ?? req.user?.sub;
    return this.promotionsService.generateCode(userId);
  }

  @Get('generate-code/cooldown')
  @ApiOperation({ summary: 'Thời gian cooldown còn lại (ms) cho generate-code của user hiện tại' })
  @ApiOkResponse({ schema: { example: { remainingMs: 7234 } } })
  getCodeGenCooldown(@Request() req: any) {
    const userId = req.user?.employeeId ?? req.user?.sub;
    return this.promotionsService.getCodeGenCooldownMs(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết promotion kèm scopes, conditions và actions' })
  @ApiParam({ name: 'id', example: 7 })
  @ApiResponse({ status: 404, description: 'Promotion không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.findOne(id);
  }

  @Get(':id/usages')
  @ApiOperation({ summary: 'Lịch sử sử dụng promotion' })
  @ApiParam({ name: 'id', example: 7 })
  @ApiResponse({ status: 404, description: 'Promotion không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findUsages(@Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.findUsages(id);
  }

  @Get(':id/usage-stats')
  @ApiOperation({ summary: 'Thống kê sử dụng promotion (tổng lượt, tổng giảm giá, unique customers)' })
  @ApiParam({ name: 'id', example: 7 })
  @ApiResponse({ status: 404, description: 'Promotion không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findUsageStats(@Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.findUsageStats(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo promotion mới (kèm scopes, conditions, actions)' })
  @ApiResponse({ status: 201, description: 'Promotion đã được tạo' })
  @ApiResponse({ status: 409, description: 'Coupon code đã tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() dto: CreatePromotionDto, @Request() req: any) {
    return this.promotionsService.create(dto, req.user?.employeeId ?? req.user?.sub);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Nhân bản promotion (tạo bản copy với trạng thái draft, xóa code)' })
  @ApiParam({ name: 'id', example: 7 })
  @ApiResponse({ status: 201, description: 'Promotion đã được nhân bản' })
  @ApiResponse({ status: 404, description: 'Promotion không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  duplicate(@Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.duplicate(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật promotion (cascade replace scopes/conditions/actions)' })
  @ApiParam({ name: 'id', example: 7 })
  @ApiResponse({ status: 200, description: 'Promotion đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Promotion không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePromotionDto) {
    return this.promotionsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Đổi trạng thái promotion (active/paused/draft/scheduled)' })
  @ApiParam({ name: 'id', example: 7 })
  @ApiResponse({ status: 200, description: 'Trạng thái đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Promotion không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  setStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: SetPromotionStatusDto) {
    return this.promotionsService.setStatus(id, dto.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá vĩnh viễn promotion (hard delete, cascade scopes/conditions/actions/usages)' })
  @ApiParam({ name: 'id', example: 7 })
  @ApiResponse({ status: 200, description: 'Promotion đã bị xoá' })
  @ApiResponse({ status: 404, description: 'Promotion không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.remove(id);
  }
}
