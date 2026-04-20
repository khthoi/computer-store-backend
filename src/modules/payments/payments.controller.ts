import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VNPayReturnDto } from './dto/vnpay-return.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  @ApiOperation({ summary: 'Tạo giao dịch thanh toán' })
  createPayment(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.createTransaction(dto);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Xem giao dịch của đơn hàng' })
  getTransaction(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentsService.getTransactionByOrder(orderId);
  }

  @Get('vnpay/return')
  @Public()
  @ApiOperation({ summary: 'VNPay IPN/Return URL (webhook)' })
  vnpayReturn(@Query() query: VNPayReturnDto) {
    return this.paymentsService.handleVNPayReturn(query);
  }

  @Post('momo/callback')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'MoMo IPN callback (webhook)' })
  momoCallback(@Body() body: any) {
    return this.paymentsService.handleMoMoCallback(body);
  }

  @Post('cod/:orderId/confirm')
  @Roles('admin', 'staff')
  @ApiOperation({ summary: '[Admin] Xác nhận giao COD thành công' })
  confirmCOD(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser('sub') adminId: number,
  ) {
    return this.paymentsService.confirmCOD(orderId, adminId);
  }
}
