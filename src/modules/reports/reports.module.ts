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
import { AdminReportsAggController } from './admin-reports-agg.controller';
import { RedisModule } from '../../common/redis/redis.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ReportsAggregateService }  from './reports-aggregate.service';
import { ReportsAggRevenueService }    from './reports-agg-revenue.service';
import { ReportsAggProductsService }   from './reports-agg-products.service';
import { ReportsAggCustomersService }  from './reports-agg-customers.service';
import { ReportsAggInventoryService }  from './reports-agg-inventory.service';
import { ReportsAggPromotionsService } from './reports-agg-promotions.service';
import { ReportsAggSupportService }    from './reports-agg-support.service';

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
    AuditLogsModule,
  ],
  controllers: [ReportsController, AdminReportsController, AdminReportsAggController],
  providers: [
    ReportsQueryService,
    ReportsComputeService,
    ReportsExportService,
    ReportProcessor,
    ReportScheduler,
    ReportsAggregateService,
    ReportsAggRevenueService,
    ReportsAggProductsService,
    ReportsAggCustomersService,
    ReportsAggInventoryService,
    ReportsAggPromotionsService,
    ReportsAggSupportService,
  ],
  exports: [ReportsQueryService],
})
export class ReportsModule {}
