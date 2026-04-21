import {
  Controller, Get, Post, Put, Body, Param, ParseIntPipe, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { LoyaltyService } from './loyalty.service';
import { CreateEarnRuleDto } from './dto/create-earn-rule.dto';
import { CreateRedemptionCatalogDto } from './dto/create-redemption-catalog.dto';
import { AdjustPointsDto } from './dto/adjust-points.dto';

@ApiTags('Admin — Loyalty')
@Controller('admin/loyalty')
@Roles('admin', 'staff')
@ApiBearerAuth()
export class AdminLoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('rules')
  @ApiOperation({ summary: 'List all loyalty earn rules (sorted by priority desc)' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          name: 'Standard Earn — 1 point per 10,000 VND',
          description: null,
          pointsPerUnit: 1,
          spendPerUnit: 10000,
          minOrderValue: 50000,
          maxPointsPerOrder: 500,
          bonusTrigger: null,
          bonusPoints: null,
          isActive: true,
          priority: 10,
          validFrom: null,
          validUntil: null,
          scopes: [],
        },
        {
          id: 2,
          name: 'First Order Bonus',
          description: 'Extra 100 points on first purchase',
          pointsPerUnit: 1,
          spendPerUnit: 10000,
          minOrderValue: null,
          maxPointsPerOrder: null,
          bonusTrigger: 'first_order',
          bonusPoints: 100,
          isActive: true,
          priority: 20,
          validFrom: null,
          validUntil: null,
          scopes: [],
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAllRules() {
    return this.loyaltyService.findAllEarnRules();
  }

  @Post('rules')
  @ApiOperation({ summary: 'Tạo earn rule mới (kèm scopes nếu có)' })
  @ApiResponse({ status: 201, description: 'Earn rule đã được tạo' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  createRule(@Body() dto: CreateEarnRuleDto, @Request() req: any) {
    return this.loyaltyService.createEarnRule(dto, req.user?.employeeId ?? req.user?.sub);
  }

  @Put('rules/:id')
  @ApiOperation({ summary: 'Cập nhật earn rule' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Earn rule đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Earn rule không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  updateRule(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateEarnRuleDto) {
    return this.loyaltyService.updateEarnRule(id, dto);
  }

  @Get('catalog')
  @ApiOperation({ summary: 'List all redemption catalog items including inactive (admin view)' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, ten: 'Giảm 50.000đ cho đơn từ 500k', diemCan: 500, promotionId: 7, laHoatDong: true, gioiHanTonKho: 100, soDaDoi: 34, hieuLucTu: '2024-01-01T00:00:00.000Z', hieuLucDen: '2024-12-31T23:59:59.000Z' },
        { id: 3, ten: 'Giảm 20k (đã tắt)', diemCan: 200, promotionId: 9, laHoatDong: false, gioiHanTonKho: 50, soDaDoi: 50, hieuLucTu: null, hieuLucDen: '2023-12-31T23:59:59.000Z' },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAllCatalog() {
    return this.loyaltyService.findAllCatalog();
  }

  @Post('catalog')
  @ApiOperation({ summary: 'Tạo catalog item đổi điểm (phải có promotion liên kết)' })
  @ApiResponse({ status: 201, description: 'Catalog item đã được tạo' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  createCatalogItem(@Body() dto: CreateRedemptionCatalogDto) {
    return this.loyaltyService.createCatalogItem(dto);
  }

  @Post('adjust')
  @ApiOperation({ summary: 'Điều chỉnh điểm thủ công cho khách hàng' })
  @ApiResponse({ status: 201, description: 'Điểm đã được điều chỉnh, trả về loyalty transaction' })
  @ApiResponse({ status: 400, description: 'Số điểm không đủ (khi trừ)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  adjustPoints(@Body() dto: AdjustPointsDto) {
    return this.loyaltyService.adjustPoints(dto);
  }
}
