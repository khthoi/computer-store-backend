import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { ReportsModule } from '../reports/reports.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [ReportsModule, RolesModule],
  controllers: [AdminDashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
