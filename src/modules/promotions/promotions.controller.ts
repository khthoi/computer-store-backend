import { Controller, Get, Post, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PromotionsService } from './promotions.service';
import { PromotionEvaluatorService, EvaluationContext } from './promotion-evaluator.service';
import { ApplyCouponDto } from './dto/apply-coupon.dto';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(
    private readonly promotionsService: PromotionsService,
    private readonly evaluatorService: PromotionEvaluatorService,
  ) {}

  @Public()
  @Get('active')
  @ApiOperation({ summary: 'Danh sách khuyến mãi đang active' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          name: 'Giảm 10% laptop mùa tựu trường',
          type: 'standard',
          isCoupon: false,
          status: 'active',
          priority: 5,
          startDate: '2024-08-01T00:00:00.000Z',
          endDate: '2024-09-15T23:59:59.000Z',
        },
      ],
    },
  })
  findActive() {
    return this.promotionsService.findActivePromotions();
  }

  @Post('apply')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Áp dụng mã coupon tại checkout' })
  @ApiOkResponse({
    schema: {
      example: {
        originalSubtotal: 15000000,
        discountAmount: 1500000,
        finalSubtotal: 13500000,
        promotionId: 1,
        promotionName: 'Giảm 10% laptop mùa tựu trường',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Mã không hợp lệ / đã hết lượt / không đủ điều kiện' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  applyCoupon(@Body() dto: ApplyCouponDto, @Request() req: any) {
    const ctx: EvaluationContext = {
      items: dto.items,
      subtotal: dto.subtotal,
      customerId: req.user?.sub ?? req.user?.customerId,
      isFirstOrder: false,
    };
    return this.evaluatorService.applyCoupon(dto.code, ctx);
  }
}
