import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [ReportsModule],
  controllers: [AdminDashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
