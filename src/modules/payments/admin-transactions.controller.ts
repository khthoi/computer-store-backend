import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminTransactionsService } from './admin-transactions.service';
import { GetTransactionsQueryDto } from './dto/get-transactions-query.dto';
import { GetTransactionsResponseDto } from './dto/transaction-row-response.dto';
import { TransactionStatsResponseDto } from './dto/transaction-stats-response.dto';
import { Transaction } from './entities/transaction.entity';

@ApiTags('Admin — Transactions')
@ApiBearerAuth()
@Roles('admin', 'staff')
@Controller('admin')
export class AdminTransactionsController {
  constructor(private readonly adminTxService: AdminTransactionsService) {}

  @Get('transactions')
  @ApiOperation({ summary: '[Admin] Danh sách giao dịch với filter và phân trang' })
  @ApiOkResponse({ type: GetTransactionsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getTransactions(@Query() query: GetTransactionsQueryDto): Promise<GetTransactionsResponseDto> {
    return this.adminTxService.getTransactionsList(query);
  }

  // /stats phải khai báo TRƯỚC /:orderCode/transaction để tránh NestJS match 'stats' như dynamic param
  @Get('transactions/stats')
  @ApiOperation({ summary: '[Admin] Thống kê tổng hợp giao dịch' })
  @ApiOkResponse({ type: TransactionStatsResponseDto })
  getTransactionStats(): Promise<TransactionStatsResponseDto> {
    return this.adminTxService.getTransactionStats();
  }

  @Get('orders/:orderCode/transaction')
  @ApiOperation({ summary: '[Admin] Lấy giao dịch theo mã đơn hàng' })
  @ApiParam({ name: 'orderCode', example: 'ORD-2024-0001' })
  @ApiOkResponse({ type: Transaction })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng hoặc giao dịch' })
  getTransactionByOrderCode(@Param('orderCode') orderCode: string): Promise<Transaction> {
    return this.adminTxService.getTransactionByOrderCode(orderCode);
  }
}
