import { Controller, Get, Post, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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
  @ApiResponse({ status: 200, description: 'Danh sách promotions active (auto-apply)' })
  findActive() {
    return this.promotionsService.findActivePromotions();
  }

  @Post('apply')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Áp dụng mã coupon tại checkout' })
  @ApiResponse({ status: 200, description: 'Kết quả giảm giá được tính' })
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
