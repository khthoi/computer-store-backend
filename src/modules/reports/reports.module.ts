import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { DailyRevenueReport } from './entities/daily-revenue-report.entity';
import { RfmSnapshot } from './entities/rfm-snapshot.entity';
import { RetentionCohort } from './entities/retention-cohort.entity';
import { InventoryHealthReport } from './entities/inventory-health-report.entity';
import { ReportJobLog } from './entities/report-job-log.entity';
import { ReportsQueryService } from './reports-query.service';
import { ReportsComputeService } from './reports-compute.service';
import { ReportsExportService } from './reports-export.service';
import { ReportProcessor, REPORT_QUEUE } from './processors/report.processor';
import { ReportScheduler } from './report-scheduler';
import { ReportsController } from './reports.controller';
import { AdminReportsController } from './admin-reports.controller';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DailyRevenueReport,
      RfmSnapshot,
      RetentionCohort,
      InventoryHealthReport,
      ReportJobLog,
    ]),
    BullModule.registerQueue({ name: REPORT_QUEUE }),
    RedisModule,
  ],
  controllers: [ReportsController, AdminReportsController],
  providers: [
    ReportsQueryService,
    ReportsComputeService,
    ReportsExportService,
    ReportProcessor,
    ReportScheduler,
  ],
  exports: [ReportsQueryService],
})
export class ReportsModule {}
