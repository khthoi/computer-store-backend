import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { RequirePermission } from '../../common/decorators/permission.decorator';

@ApiTags('Admin — Dashboard')
@ApiBearerAuth('access-token')
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @RequirePermission('reports.read')
  @ApiOperation({ summary: 'Dashboard overview — KPIs, charts, recent orders, low stock' })
  @ApiOkResponse({ description: 'Full dashboard payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getOverview() {
    return this.dashboardService.getOverview();
  }
}
