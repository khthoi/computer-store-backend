import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, ParseIntPipe, HttpCode, Request, Query, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MembershipTierResponseDto } from './dto/loyalty-response.dto';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { LoyaltyService } from './loyalty.service';
import { MembershipTierService } from './membership-tier.service';
import { CreateEarnRuleDto } from './dto/create-earn-rule.dto';
import { CreateRedemptionCatalogDto } from './dto/create-redemption-catalog.dto';
import { UpdateRedemptionCatalogDto } from './dto/update-redemption-catalog.dto';
import { AdjustPointsDto } from './dto/adjust-points.dto';
import { CreateMembershipTierDto } from './dto/create-membership-tier.dto';
import { UpdateMembershipTierDto } from './dto/update-membership-tier.dto';

@ApiTags('Admin — Loyalty')
@Controller('admin/loyalty')
@ApiBearerAuth()
export class AdminLoyaltyController {
  constructor(
    private readonly loyaltyService: LoyaltyService,
    private readonly membershipTierService: MembershipTierService,
  ) {}

  // ─── Earn Rules ───────────────────────────────────────────────────────────

  @Get('rules')
  @RequirePermission('loyalty.read')
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
  @RequirePermission('loyalty.read')
  @ApiOperation({ summary: 'Chi tiết một earn rule theo ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 404, description: 'Earn rule không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findRuleById(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyService.findEarnRuleById(id);
  }

  @Post('rules')
  @RequirePermission('loyalty.create')
  @ApiOperation({ summary: 'Tạo earn rule mới (kèm scopes nếu có)' })
  @ApiResponse({ status: 201, description: 'Earn rule đã được tạo' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  createRule(@Body() dto: CreateEarnRuleDto, @Request() req: any) {
    return this.loyaltyService.createEarnRule(dto, req.user?.employeeId ?? req.user?.sub);
  }

  @Put('rules/:id')
  @RequirePermission('loyalty.update')
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
  @RequirePermission('loyalty.delete')
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
  @RequirePermission('loyalty.read')
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
  @RequirePermission('loyalty.create')
  @ApiOperation({ summary: 'Tạo catalog item đổi điểm (phải có promotion liên kết)' })
  @ApiResponse({ status: 201, description: 'Catalog item đã được tạo' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  createCatalogItem(@Body() dto: CreateRedemptionCatalogDto) {
    return this.loyaltyService.createCatalogItem(dto);
  }

  @Put('catalog/:id')
  @RequirePermission('loyalty.update')
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
  @RequirePermission('loyalty.delete')
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
  @RequirePermission('loyalty.update')
  @ApiOperation({ summary: 'Điều chỉnh điểm thủ công cho khách hàng' })
  @ApiResponse({ status: 201, description: 'Điểm đã được điều chỉnh' })
  @ApiResponse({ status: 400, description: 'Số điểm không đủ (khi trừ)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  adjustPoints(@Body() dto: AdjustPointsDto) {
    return this.loyaltyService.adjustPoints(dto);
  }

  // ─── Membership Tiers ─────────────────────────────────────────────────────

  @Get('tiers')
  @RequirePermission('loyalty.read')
  @ApiOperation({ summary: 'Danh sách hạng thành viên (phân trang, tìm kiếm)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getMembershipTiers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.membershipTierService.findAll(page, limit, search, activeOnly === 'true');
  }

  @Get('tiers/:id')
  @RequirePermission('loyalty.read')
  @ApiOperation({ summary: 'Chi tiết một hạng thành viên' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: MembershipTierResponseDto })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMembershipTierById(@Param('id', ParseIntPipe) id: number) {
    return this.membershipTierService.findById(id);
  }

  @Post('tiers')
  @RequirePermission('loyalty.create')
  @ApiOperation({ summary: 'Tạo hạng thành viên mới (validate overlap)' })
  @ApiCreatedResponse({ type: MembershipTierResponseDto })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Tên trùng hoặc khoảng điểm bị chồng lấp' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createMembershipTier(@Body() dto: CreateMembershipTierDto) {
    return this.membershipTierService.create(dto);
  }

  @Patch('tiers/:id')
  @RequirePermission('loyalty.update')
  @ApiOperation({ summary: 'Cập nhật hạng thành viên (validate overlap với các hạng khác)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: MembershipTierResponseDto })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  @ApiResponse({ status: 409, description: 'Tên trùng hoặc khoảng điểm bị chồng lấp' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateMembershipTier(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMembershipTierDto,
  ) {
    return this.membershipTierService.update(id, dto);
  }

  @Delete('tiers/:id')
  @RequirePermission('loyalty.delete')
  @HttpCode(204)
  @ApiOperation({ summary: 'Xóa hạng thành viên (từ chối nếu có khách hàng đang ở bậc này)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 204, description: 'Đã xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  @ApiResponse({ status: 409, description: 'Vẫn còn khách hàng đang ở bậc này' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  deleteMembershipTier(@Param('id', ParseIntPipe) id: number) {
    return this.membershipTierService.remove(id);
  }
}
