import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiQuery, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { QueryPromotionDto } from './dto/query-promotion.dto';

@ApiTags('Admin — Promotions')
@Controller('admin/promotions')
@Roles('admin', 'staff')
@ApiBearerAuth()
export class AdminPromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all promotions with optional filters and pagination' })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'active', 'scheduled', 'paused', 'ended', 'cancelled'], example: 'active', description: 'Filter by promotion status' })
  @ApiQuery({ name: 'type', required: false, enum: ['standard', 'bxgy', 'bundle', 'bulk', 'free_shipping'], example: 'standard', description: 'Filter by promotion type' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by promotion name', example: 'Giảm giá laptop' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiOkResponse({
    schema: {
      example: {
        items: [
          {
            id: 7,
            name: 'Giảm 10% laptop mùa tựu trường',
            type: 'standard',
            isCoupon: false,
            code: null,
            status: 'active',
            priority: 5,
            stackingPolicy: 'exclusive',
            startDate: '2024-08-01T00:00:00.000Z',
            endDate: '2024-09-15T23:59:59.000Z',
            totalUsageLimit: 500,
            perCustomerLimit: 1,
            usageCount: 123,
          },
        ],
        total: 42,
        page: 1,
        limit: 20,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAll(@Query() query: QueryPromotionDto) {
    return this.promotionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get promotion detail including scopes, conditions and actions' })
  @ApiParam({ name: 'id', example: 7 })
  @ApiOkResponse({
    schema: {
      example: {
        id: 7,
        name: 'Giảm 10% laptop mùa tựu trường',
        description: 'Áp dụng cho laptop từ 15 triệu trở lên',
        type: 'standard',
        isCoupon: false,
        code: null,
        status: 'active',
        priority: 5,
        stackingPolicy: 'exclusive',
        startDate: '2024-08-01T00:00:00.000Z',
        endDate: '2024-09-15T23:59:59.000Z',
        totalUsageLimit: 500,
        perCustomerLimit: 1,
        usageCount: 123,
        scopes: [{ id: 1, scopeType: 'category', scopeId: 2 }],
        conditions: [{ id: 1, conditionType: 'min_order_value', value: '15000000' }],
        actions: [{ id: 1, actionType: 'percent_discount', value: '10', maxDiscount: '500000' }],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo promotion mới (kèm scopes, conditions, actions)' })
  @ApiResponse({ status: 201, description: 'Promotion đã được tạo' })
  @ApiResponse({ status: 409, description: 'Coupon code đã tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  create(@Body() dto: CreatePromotionDto, @Request() req: any) {
    return this.promotionsService.create(dto, req.user?.employeeId ?? req.user?.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật promotion' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Promotion đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Promotion không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePromotionDto) {
    return this.promotionsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hủy promotion (set status = cancelled)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Promotion đã bị hủy' })
  @ApiResponse({ status: 404, description: 'Promotion không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.cancel(id);
  }
}
