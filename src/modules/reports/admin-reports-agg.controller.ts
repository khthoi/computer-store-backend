import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportsAggregateService } from './reports-aggregate.service';
import { ReportPeriod } from './reports-agg.helpers';

@ApiTags('Admin — Reports Aggregate')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/reports/agg')
export class AdminReportsAggController {
  constructor(private readonly aggService: ReportsAggregateService) {}

  @Get('executive')
  @Roles('admin', 'staff')
  @ApiOperation({ summary: 'Executive summary — tổng hợp tất cả KPI' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d', '1y'], example: '30d' })
  getExecutive(@Query('period') period: ReportPeriod = '30d') {
    return this.aggService.getExecutive(period);
  }

  @Get('revenue')
  @Roles('admin', 'staff')
  @ApiOperation({ summary: 'Báo cáo doanh thu tổng hợp' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d', '1y'], example: '30d' })
  getRevenue(@Query('period') period: ReportPeriod = '30d') {
    return this.aggService.getRevenue(period);
  }

  @Get('products')
  @Roles('admin', 'staff')
  @ApiOperation({ summary: 'Báo cáo hiệu suất sản phẩm' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d', '1y'], example: '30d' })
  getProducts(@Query('period') period: ReportPeriod = '30d') {
    return this.aggService.getProducts(period);
  }

  @Get('customers')
  @Roles('admin', 'staff')
  @ApiOperation({ summary: 'Báo cáo khách hàng và RFM' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d', '1y'], example: '30d' })
  getCustomers(@Query('period') period: ReportPeriod = '30d') {
    return this.aggService.getCustomers(period);
  }

  @Get('inventory')
  @Roles('admin', 'staff')
  @ApiOperation({ summary: 'Báo cáo tồn kho' })
  getInventory() {
    return this.aggService.getInventory();
  }

  @Get('promotions')
  @Roles('admin', 'staff')
  @ApiOperation({ summary: 'Báo cáo khuyến mãi và flash sale' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d', '1y'], example: '30d' })
  getPromotions(@Query('period') period: ReportPeriod = '30d') {
    return this.aggService.getPromotions(period);
  }

  @Get('support')
  @Roles('admin', 'staff')
  @ApiOperation({ summary: 'Báo cáo hỗ trợ và đánh giá' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d', '1y'], example: '30d' })
  getSupport(@Query('period') period: ReportPeriod = '30d') {
    return this.aggService.getSupport(period);
  }
}
