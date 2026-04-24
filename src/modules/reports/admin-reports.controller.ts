import {
  Controller, Get, Query, Res, UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags, ApiOperation, ApiOkResponse, ApiResponse,
  ApiBearerAuth, ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportsQueryService } from './reports-query.service';
import { ReportsExportService } from './reports-export.service';
import { QueryRevenueDto } from './dto/query-revenue.dto';
import { QueryTopProductsDto } from './dto/query-top-products.dto';
import { QueryRfmDto } from './dto/query-rfm.dto';
import { QueryInventoryHealthDto } from './dto/query-inventory-health.dto';
import { ExportReportDto } from './dto/export-report.dto';

@ApiTags('Admin — Reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(
    private readonly queryService: ReportsQueryService,
    private readonly exportService: ReportsExportService,
  ) {}

  @Get('revenue')
  @Roles('report.view')
  @ApiOperation({ summary: 'Dữ liệu biểu đồ doanh thu theo ngày' })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-01-01', description: 'Ngày bắt đầu' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-04-24', description: 'Ngày kết thúc' })
  @ApiOkResponse({
    schema: {
      example: {
        summary: { totalGmv: 500000000, totalNetRevenue: 460000000, totalOrders: 120, totalCompleted: 98 },
        data: [{ date: '2026-04-24', gmv: 25000000, netRevenue: 23000000, ordersPlaced: 8, ordersCompleted: 7 }],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — không có quyền xem báo cáo' })
  getRevenue(@Query() dto: QueryRevenueDto) {
    return this.queryService.getRevenue(dto);
  }

  @Get('top-products')
  @Roles('report.view')
  @ApiOperation({ summary: 'Sản phẩm bán chạy nhất theo khoảng thời gian' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d', '365d'], example: '30d', description: 'Khoảng thời gian' })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Số lượng sản phẩm (tối đa 50)' })
  @ApiOkResponse({
    schema: {
      example: [{ variantId: 5, sku: 'CPU-I9-14900K', variantName: 'Intel Core i9-14900K', productName: 'Intel Core i9-14900K', totalSold: 48, totalRevenue: 720000000 }],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getTopProducts(@Query() dto: QueryTopProductsDto) {
    return this.queryService.getTopProducts(dto);
  }

  @Get('customers/summary')
  @Roles('report.view')
  @ApiOperation({ summary: 'Phân phối segment RFM khách hàng (cho pie chart)' })
  @ApiOkResponse({
    schema: {
      example: [
        { segment: 'Champions', count: '45', avgMonetary: '12500000' },
        { segment: 'Loyal', count: '120', avgMonetary: '7200000' },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getRfmSummary() {
    return this.queryService.getRfmSummary();
  }

  @Get('customers')
  @Roles('report.view')
  @ApiOperation({ summary: 'Danh sách phân khúc RFM khách hàng (phân trang)' })
  @ApiQuery({ name: 'segment', required: false, example: 'Champions', description: 'Lọc theo segment' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Trang' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Số bản ghi / trang' })
  @ApiOkResponse({
    schema: {
      example: {
        items: [{ customerId: 12, segment: 'Champions', rScore: 5, fScore: 5, mScore: 5, monetary: '15000000', frequency: 8 }],
        total: 45,
        page: 1,
        limit: 20,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getRfmCustomers(@Query() dto: QueryRfmDto) {
    return this.queryService.getRfmCustomers(dto);
  }

  @Get('inventory-health')
  @Roles('report.view')
  @ApiOperation({ summary: 'Tình trạng sức khỏe kho theo biến thể sản phẩm' })
  @ApiQuery({ name: 'bucket', required: false, enum: ['het_hang', 'thap', 'tot', 'ton_kho'], description: 'Lọc theo nhóm tình trạng' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Trang' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Số bản ghi / trang' })
  @ApiOkResponse({
    schema: {
      example: {
        items: [{ variantId: 3, sku: 'RAM-16G-DDR5', stockQty: 2, daysOfInventory: 4, bucket: 'thap' }],
        total: 38,
        page: 1,
        limit: 20,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getInventoryHealth(@Query() dto: QueryInventoryHealthDto) {
    return this.queryService.getInventoryHealth(dto);
  }

  @Get('retention')
  @Roles('report.view')
  @ApiOperation({ summary: 'Ma trận cohort retention khách hàng theo tháng' })
  @ApiOkResponse({
    schema: {
      example: [{ cohortMonth: '2026-01', initialCustomers: 80, m0: 100, m1: 42, m2: 31, m3: 25 }],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getRetention() {
    return this.queryService.getRetentionCohort();
  }

  @Get('job-logs')
  @Roles('report.view')
  @ApiOperation({ summary: 'Lịch sử chạy cron job báo cáo' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Số bản ghi gần nhất' })
  @ApiOkResponse({
    schema: {
      example: [{ id: 5, jobName: 'daily_revenue', status: 'success', startedAt: '2026-04-24T00:00:02Z', durationMs: 1240, rowsProcessed: 1 }],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getJobLogs(@Query('limit') limit?: number) {
    return this.queryService.getJobLogs(limit ? Number(limit) : 20);
  }

  @Get('export')
  @Roles('report.export')
  @ApiOperation({ summary: 'Xuất báo cáo dạng Excel (.xlsx)' })
  @ApiQuery({ name: 'type', required: true, enum: ['revenue', 'rfm', 'inventory'], description: 'Loại báo cáo' })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-01-01', description: 'Ngày bắt đầu (cho báo cáo doanh thu)' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-04-24', description: 'Ngày kết thúc (cho báo cáo doanh thu)' })
  @ApiResponse({ status: 200, description: 'File Excel trả về dưới dạng stream' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — không có quyền xuất báo cáo' })
  async exportReport(@Query() dto: ExportReportDto, @Res() res: Response) {
    let buffer: ArrayBuffer;
    let filename: string;

    if (dto.type === 'revenue') {
      buffer = await this.exportService.exportRevenue(dto.startDate, dto.endDate);
      filename = `revenue_${dto.startDate ?? ''}_${dto.endDate ?? ''}.xlsx`;
    } else if (dto.type === 'rfm') {
      buffer = await this.exportService.exportRfm();
      filename = `rfm_customers.xlsx`;
    } else {
      buffer = await this.exportService.exportInventoryHealth();
      filename = `inventory_health.xlsx`;
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  }
}
