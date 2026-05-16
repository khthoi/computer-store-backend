import { Controller, Get, Post, Body, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { LoyaltyService } from './loyalty.service';
import { RedeemPointsDto } from './dto/redeem-points.dto';

@ApiTags('Loyalty')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('points')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xem số điểm tích lũy hiện tại của khách hàng' })
  @ApiOkResponse({ schema: { example: 1250 } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getBalance(@Request() req: any) {
    return this.loyaltyService.getBalance(req.user?.sub ?? req.user?.customerId);
  }

  @Get('transactions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lịch sử giao dịch điểm tích lũy — phân trang khi truyền page/limit, ngược lại trả 100 dòng gần nhất' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiOkResponse({
    schema: {
      example: {
        items: [
          { id: 88, transactionType: 'earn', points: 120, balanceBefore: 1130, balanceAfter: 1250, description: 'Tích điểm đơn hàng #201', referenceType: 'don_hang', referenceId: 201, createdAt: '2024-05-28T09:00:00.000Z' },
        ],
        total: 1, page: 1, limit: 10, totalPages: 1,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getTransactions(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const customerId = req.user?.sub ?? req.user?.customerId;
    if (page !== undefined || limit !== undefined) {
      return this.loyaltyService.getTransactionsPaginated(
        customerId,
        page ? Number(page) : 1,
        limit ? Number(limit) : 10,
      );
    }
    return this.loyaltyService.getTransactions(customerId);
  }

  @Public()
  @Get('earn-rules')
  @ApiOperation({ summary: 'Danh sách quy tắc tích điểm đang hoạt động (public)' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: '1',
          name: 'Tích điểm theo chi tiêu',
          description: '1 điểm cho mỗi 100.000đ chi tiêu',
          pointsPerUnit: 1,
          spendPerUnit: 100000,
          minOrderValue: null,
          maxPointsPerOrder: null,
          bonusTrigger: null,
          bonusPoints: null,
          scopes: [],
          isActive: true,
          priority: 10,
          validFrom: null,
          validUntil: null,
        },
      ],
    },
  })
  async getEarnRules() {
    const rules = await this.loyaltyService.findActiveEarnRules();
    return rules.map((r) => this.loyaltyService.toEarnRulePublicDto(r));
  }

  @Public()
  @Get('tiers')
  @ApiOperation({ summary: 'Danh sách hạng thành viên đang hoạt động (public)' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, name: 'Bronze', displayName: 'Hạng Đồng', minPoints: 0, maxPoints: 999, color: '#cd7f32', description: 'Khách hàng mới', sortOrder: 1 },
        { id: 2, name: 'Silver', displayName: 'Hạng Bạc',  minPoints: 1000, maxPoints: 4999, color: '#c0c0c0', description: 'Khách hàng thân thiết', sortOrder: 2 },
        { id: 3, name: 'Gold',   displayName: 'Hạng Vàng', minPoints: 5000, maxPoints: null, color: '#ffd700', description: 'Khách hàng VIP', sortOrder: 3 },
      ],
    },
  })
  getTiers() {
    return this.loyaltyService.findAllMembershipTiers(true);
  }

  @Public()
  @Get('catalog')
  @ApiOperation({ summary: 'Danh sách phần thưởng đang hoạt động có thể đổi điểm (public)' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, ten: 'Giảm 50.000đ cho đơn từ 500k', diemCan: 500, promotionId: 7, laHoatDong: true, gioiHanTonKho: 100, soDaDoi: 34, hieuLucTu: '2024-01-01T00:00:00.000Z', hieuLucDen: '2024-12-31T23:59:59.000Z' },
        { id: 2, ten: 'Freeship toàn quốc', diemCan: 300, promotionId: 8, laHoatDong: true, gioiHanTonKho: null, soDaDoi: 120, hieuLucTu: null, hieuLucDen: null },
      ],
    },
  })
  getCatalog() {
    return this.loyaltyService.findActiveCatalog();
  }

  @Get('redemptions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lịch sử đổi điểm — phân trang khi truyền page/limit' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyRedemptions(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const customerId = req.user?.sub ?? req.user?.customerId;
    if (page !== undefined || limit !== undefined) {
      return this.loyaltyService.getMyRedemptionsPaginated(
        customerId,
        page ? Number(page) : 1,
        limit ? Number(limit) : 10,
      );
    }
    return this.loyaltyService.getMyRedemptions(customerId);
  }

  @Post('redeem')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đổi điểm lấy coupon từ catalog' })
  @ApiResponse({ status: 201, description: 'Đổi điểm thành công, trả về redemption record kèm mã coupon' })
  @ApiResponse({ status: 400, description: 'Không đủ điểm / phần thưởng hết số lượng' })
  @ApiResponse({ status: 404, description: 'Catalog item không tồn tại hoặc hết hiệu lực' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  redeem(@Body() dto: RedeemPointsDto, @Request() req: any) {
    return this.loyaltyService.redeemPoints(dto, req.user?.sub ?? req.user?.customerId);
  }
}
