import { Controller, Get, Post, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { LoyaltyService } from './loyalty.service';
import { RedeemPointsDto } from './dto/redeem-points.dto';

@ApiTags('Loyalty')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('points')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current loyalty point balance of the authenticated customer' })
  @ApiOkResponse({ schema: { example: 1250 } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getBalance(@Request() req: any) {
    return this.loyaltyService.getBalance(req.user?.sub ?? req.user?.customerId);
  }

  @Get('transactions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get loyalty point transaction history (latest 100)' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 88, loaiGiaoDich: 'earn', diem: 120, soDuTruoc: 1130, soDuSau: 1250, moTa: 'Earn points for order #201', loaiThamChieu: 'don_hang', thamChieuId: 201, ngayTao: '2024-05-28T09:00:00.000Z' },
        { id: 75, loaiGiaoDich: 'redeem', diem: -500, soDuTruoc: 1630, soDuSau: 1130, moTa: 'Redeem: Giảm 50k', loaiThamChieu: 'loyalty_redemption', thamChieuId: 12, ngayTao: '2024-05-20T14:00:00.000Z' },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getTransactions(@Request() req: any) {
    return this.loyaltyService.getTransactions(req.user?.sub ?? req.user?.customerId);
  }

  @Public()
  @Get('catalog')
  @ApiOperation({ summary: 'List all active redemption rewards (public)' })
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
  @ApiOperation({ summary: 'Get redemption history of the authenticated customer' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 12, catalogId: 1, tenSnapshot: 'Giảm 50.000đ cho đơn từ 500k', diemDaDoi: 500, maCoupon: 'LR-A1B2C3', promotionId: 7, trangThai: 'completed', ngayDoi: '2024-05-20T14:00:00.000Z', ngaySuDung: '2024-05-21T10:00:00.000Z', donHangId: 205 },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyRedemptions(@Request() req: any) {
    return this.loyaltyService.getMyRedemptions(req.user?.sub ?? req.user?.customerId);
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
