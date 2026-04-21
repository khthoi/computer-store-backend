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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
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
  @ApiParam({ name: 'orderId', example: 101 })
  @ApiOkResponse({
    schema: {
      example: {
        id: 55,
        orderId: 101,
        method: 'vnpay',
        status: 'ThanhCong',
        amount: 15500000,
        transactionRef: 'VNP20240315ABC123',
        paidAt: '2024-03-15T10:35:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Giao dịch không tồn tại' })
  getTransaction(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentsService.getTransactionByOrder(orderId);
  }

  @Get('vnpay/return')
  @Public()
  @ApiOperation({ summary: 'VNPay IPN/Return URL (webhook)' })
  @ApiQuery({ name: 'vnp_ResponseCode', required: false, example: '00', description: 'Mã phản hồi VNPay (00 = thành công)' })
  @ApiQuery({ name: 'vnp_TxnRef', required: false, example: 'ORD-20240315-0001', description: 'Mã tham chiếu giao dịch' })
  @ApiQuery({ name: 'vnp_TransactionNo', required: false, example: '14057967', description: 'Mã giao dịch tại VNPay' })
  @ApiQuery({ name: 'vnp_Amount', required: false, example: '1550000000', description: 'Số tiền * 100' })
  @ApiQuery({ name: 'vnp_BankCode', required: false, example: 'NCB', description: 'Mã ngân hàng' })
  @ApiQuery({ name: 'vnp_SecureHash', required: false, example: 'abc123...', description: 'Chữ ký bảo mật' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        orderId: 101,
        message: 'Thanh toán thành công',
      },
    },
  })
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
