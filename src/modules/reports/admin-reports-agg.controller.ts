import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { ReportsAggregateService } from './reports-aggregate.service';
import { ReportPeriod } from './reports-agg.helpers';

@ApiTags('Admin — Reports Aggregate')
@ApiBearerAuth('access-token')
@Controller('admin/reports/agg')
export class AdminReportsAggController {
  constructor(private readonly aggService: ReportsAggregateService) {}

  @Get('executive')
  @RequirePermission('reports.read')
  @ApiOperation({ summary: 'Executive summary — tổng hợp tất cả KPI' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d', '1y'], example: '30d' })
  getExecutive(@Query('period') period: ReportPeriod = '30d') {
    return this.aggService.getExecutive(period);
  }

  @Get('revenue')
  @RequirePermission('reports.read')
  @ApiOperation({ summary: 'Báo cáo doanh thu tổng hợp' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d', '1y'], example: '30d' })
  getRevenue(@Query('period') period: ReportPeriod = '30d') {
    return this.aggService.getRevenue(period);
  }

  @Get('products')
  @RequirePermission('reports.read')
  @ApiOperation({ summary: 'Báo cáo hiệu suất sản phẩm' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d', '1y'], example: '30d' })
  getProducts(@Query('period') period: ReportPeriod = '30d') {
    return this.aggService.getProducts(period);
  }

  @Get('customers')
  @RequirePermission('reports.read')
  @ApiOperation({ summary: 'Báo cáo khách hàng và RFM' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d', '1y'], example: '30d' })
  getCustomers(@Query('period') period: ReportPeriod = '30d') {
    return this.aggService.getCustomers(period);
  }

  @Get('inventory')
  @RequirePermission('reports.read')
  @ApiOperation({ summary: 'Báo cáo tồn kho' })
  getInventory() {
    return this.aggService.getInventory();
  }

  @Get('promotions')
  @RequirePermission('reports.read')
  @ApiOperation({ summary: 'Báo cáo khuyến mãi và flash sale' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d', '1y'], example: '30d' })
  getPromotions(@Query('period') period: ReportPeriod = '30d') {
    return this.aggService.getPromotions(period);
  }

  @Get('support')
  @RequirePermission('reports.read')
  @ApiOperation({ summary: 'Báo cáo hỗ trợ và đánh giá' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d', '1y'], example: '30d' })
  getSupport(@Query('period') period: ReportPeriod = '30d') {
    return this.aggService.getSupport(period);
  }
}
