import {
  Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, HttpCode, Request, Query, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { LoyaltyService } from './loyalty.service';
import { CreateEarnRuleDto } from './dto/create-earn-rule.dto';
import { CreateRedemptionCatalogDto } from './dto/create-redemption-catalog.dto';
import { UpdateRedemptionCatalogDto } from './dto/update-redemption-catalog.dto';
import { AdjustPointsDto } from './dto/adjust-points.dto';

@ApiTags('Admin — Loyalty')
@Controller('admin/loyalty')
@Roles('admin', 'staff')
@ApiBearerAuth()
export class AdminLoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  // ─── Earn Rules ───────────────────────────────────────────────────────────

  @Get('rules')
  @ApiOperation({ summary: 'Danh sách tất cả earn rules (sắp xếp theo priority giảm dần)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAllRules(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.loyaltyService.findAllEarnRules(page, limit, search);
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Chi tiết một earn rule theo ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 404, description: 'Earn rule không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findRuleById(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyService.findEarnRuleById(id);
  }

  @Post('rules')
  @ApiOperation({ summary: 'Tạo earn rule mới (kèm scopes nếu có)' })
  @ApiResponse({ status: 201, description: 'Earn rule đã được tạo' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  createRule(@Body() dto: CreateEarnRuleDto, @Request() req: any) {
    return this.loyaltyService.createEarnRule(dto, req.user?.employeeId ?? req.user?.sub);
  }

  @Put('rules/:id')
  @ApiOperation({ summary: 'Cập nhật earn rule (thay thế toàn bộ scopes nếu truyền vào)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Earn rule đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Earn rule không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  updateRule(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateEarnRuleDto) {
    return this.loyaltyService.updateEarnRule(id, dto);
  }

  @Delete('rules/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Xóa earn rule và toàn bộ scopes liên quan' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 204, description: 'Đã xóa thành công' })
  @ApiResponse({ status: 404, description: 'Earn rule không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  deleteRule(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyService.deleteEarnRule(id);
  }

  // ─── Redemption Catalog ───────────────────────────────────────────────────

  @Get('catalog')
  @ApiOperation({ summary: 'Danh sách tất cả catalog items kể cả đã tắt (admin view)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAllCatalog(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.loyaltyService.findAllCatalog(page, limit, search);
  }

  @Post('catalog')
  @ApiOperation({ summary: 'Tạo catalog item đổi điểm (phải có promotion liên kết)' })
  @ApiResponse({ status: 201, description: 'Catalog item đã được tạo' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  createCatalogItem(@Body() dto: CreateRedemptionCatalogDto) {
    return this.loyaltyService.createCatalogItem(dto);
  }

  @Put('catalog/:id')
  @ApiOperation({ summary: 'Cập nhật catalog item đổi điểm' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Catalog item đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Catalog item không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  updateCatalogItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRedemptionCatalogDto,
  ) {
    return this.loyaltyService.updateCatalogItem(id, dto);
  }

  @Delete('catalog/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Xóa catalog item đổi điểm' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 204, description: 'Đã xóa thành công' })
  @ApiResponse({ status: 404, description: 'Catalog item không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  deleteCatalogItem(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyService.deleteCatalogItem(id);
  }

  // ─── Point Adjustment ────────────────────────────────────────────────────

  @Post('adjust')
  @ApiOperation({ summary: 'Điều chỉnh điểm thủ công cho khách hàng' })
  @ApiResponse({ status: 201, description: 'Điểm đã được điều chỉnh' })
  @ApiResponse({ status: 400, description: 'Số điểm không đủ (khi trừ)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  adjustPoints(@Body() dto: AdjustPointsDto) {
    return this.loyaltyService.adjustPoints(dto);
  }
}
