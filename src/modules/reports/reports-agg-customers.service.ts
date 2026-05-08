import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RfmSnapshot } from './entities/rfm-snapshot.entity';
import { RetentionCohort } from './entities/retention-cohort.entity';
import {
  ReportPeriod, buildKpiCard, periodDays, daysAgoStr, todayStr,
} from './reports-agg.helpers';

type FrontendSegment = 'Champions' | 'Loyal' | 'At Risk' | 'New' | 'Hibernating' | 'Lost';

const SEGMENT_MAP: Record<string, FrontendSegment> = {
  Champions:   'Champions',
  Loyal:       'Loyal',
  Potential:   'Loyal',
  'At Risk':   'At Risk',
  New:         'New',
  Promising:   'New',
  Hibernating: 'Hibernating',
  Lost:        'Lost',
};

export interface CustomerReport {
  kpis: {
    totalCustomers: ReturnType<typeof buildKpiCard>;
    newCustomers:   ReturnType<typeof buildKpiCard>;
    repeatRate:     ReturnType<typeof buildKpiCard>;
    avgClv:         ReturnType<typeof buildKpiCard>;
  };
  acquisitionSeries: { date: string; value: number }[];
  rfmSegments: {
    segment: FrontendSegment;
    count: number;
    share: number;
    avgOrderValue: number;
  }[];
  topCustomers: {
    customerId: string;
    name: string;
    totalSpent: number;
    orderCount: number;
    segment: FrontendSegment;
  }[];
  retentionByMonth: { cohort: string; m0: number; m1: number; m2: number; m3: number }[];
}

@Injectable()
export class ReportsAggCustomersService {
  constructor(
    @InjectRepository(RfmSnapshot)
    private readonly rfmRepo: Repository<RfmSnapshot>,
    @InjectRepository(RetentionCohort)
    private readonly cohortRepo: Repository<RetentionCohort>,
    private readonly dataSource: DataSource,
  ) {}

  async computeCustomers(period: ReportPeriod): Promise<CustomerReport> {
    const days = periodDays(period);
    const today = todayStr();
    const curFrom = daysAgoStr(days);
    const prevFrom = daysAgoStr(days * 2);
    const prevTo = daysAgoStr(days + 1);

    const [totCur, totPrev, newCur, newPrev, repeatRows, acquisitionRows] = await Promise.all([
      this.dataSource.query<{ cnt: string }[]>(
        `SELECT COUNT(*) AS cnt FROM khach_hang WHERE trang_thai != 'BiKhoa'`,
      ),
      this.dataSource.query<{ cnt: string }[]>(
        `SELECT COUNT(*) AS cnt FROM khach_hang WHERE trang_thai != 'BiKhoa' AND DATE(ngay_dang_ky) <= ?`,
        [prevTo],
      ),
      this.dataSource.query<{ cnt: string }[]>(
        `SELECT COUNT(*) AS cnt FROM khach_hang WHERE DATE(ngay_dang_ky) >= ? AND DATE(ngay_dang_ky) <= ?`,
        [curFrom, today],
      ),
      this.dataSource.query<{ cnt: string }[]>(
        `SELECT COUNT(*) AS cnt FROM khach_hang WHERE DATE(ngay_dang_ky) >= ? AND DATE(ngay_dang_ky) <= ?`,
        [prevFrom, prevTo],
      ),
      // repeat-buyer rate: customers who placed >= 2 orders in period / total buyers
      this.dataSource.query<{ total: string; repeat_count: string }[]>(`
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN ord_count >= 2 THEN 1 ELSE 0 END) AS repeat_count
        FROM (
          SELECT khach_hang_id, COUNT(*) AS ord_count
          FROM don_hang
          WHERE DATE(ngay_dat_hang) >= ? AND DATE(ngay_dat_hang) <= ?
            AND trang_thai_don NOT IN ('DaHuy')
          GROUP BY khach_hang_id
        ) sub
      `, [curFrom, today]),
      this.dataSource.query<{ date: string; cnt: string }[]>(`
        SELECT DATE(ngay_dang_ky) AS date, COUNT(*) AS cnt
        FROM khach_hang
        WHERE DATE(ngay_dang_ky) >= ? AND DATE(ngay_dang_ky) <= ?
        GROUP BY DATE(ngay_dang_ky)
        ORDER BY date ASC
      `, [curFrom, today]),
    ]);

    const curTotal  = Number(totCur[0]?.cnt  ?? 0);
    const prevTotal = Number(totPrev[0]?.cnt ?? 0);
    const curNew    = Number(newCur[0]?.cnt  ?? 0);
    const prevNew   = Number(newPrev[0]?.cnt ?? 0);
    const repTotal  = Number(repeatRows[0]?.total  ?? 0);
    const repRepeat = Number(repeatRows[0]?.repeat_count ?? 0);
    const curRepeat = repTotal > 0 ? (repRepeat / repTotal) * 100 : 0;

    const rfmAll = await this.rfmRepo.find();
    const rfmTotal = rfmAll.length || 1;

    // Aggregate into frontend segments
    const segMap = new Map<FrontendSegment, { count: number; aovSum: number }>();
    for (const r of rfmAll) {
      const seg = SEGMENT_MAP[r.segment] ?? 'Lost';
      const existing = segMap.get(seg) ?? { count: 0, aovSum: 0 };
      existing.count++;
      existing.aovSum += Number(r.avgOrderValue);
      segMap.set(seg, existing);
    }

    const rfmSegments = Array.from(segMap.entries()).map(([segment, v]) => ({
      segment,
      count: v.count,
      share: Math.round((v.count / rfmTotal) * 1000) / 10,
      avgOrderValue: v.count > 0 ? Math.round(v.aovSum / v.count) : 0,
    }));

    // avgClv = average monetary across all RFM customers
    const totalMonetary = rfmAll.reduce((a, r) => a + Number(r.monetary), 0);
    const curAvgClv = rfmAll.length > 0 ? Math.round(totalMonetary / rfmAll.length) : 0;

    const topRfmRows = await this.dataSource.query<{
      customerId: number; hoTen: string; monetary: string; frequency: string; segment: string;
    }[]>(`
      SELECT r.khach_hang_id AS customerId, kh.ho_ten AS hoTen,
             r.monetary, r.frequency, r.segment
      FROM report_rfm_snapshot r
      JOIN khach_hang kh ON kh.khach_hang_id = r.khach_hang_id
      ORDER BY r.monetary DESC
      LIMIT 20
    `);

    const topCustomers = topRfmRows.map(r => ({
      customerId: String(r.customerId),
      name:       r.hoTen,
      totalSpent: Number(r.monetary),
      orderCount: Number(r.frequency),
      segment:    (SEGMENT_MAP[r.segment] ?? 'Lost') as FrontendSegment,
    }));

    const cohorts = await this.cohortRepo
      .createQueryBuilder('c')
      .orderBy('c.cohortMonth', 'DESC')
      .limit(6)
      .getMany();

    const retentionByMonth = cohorts.reverse().map(c => ({
      cohort: c.cohortMonth,
      m0: c.m0 ?? 100,
      m1: c.m1 ?? 0,
      m2: c.m2 ?? 0,
      m3: c.m3 ?? 0,
    }));

    return {
      kpis: {
        totalCustomers: buildKpiCard('Tổng khách hàng', curTotal, prevTotal, 'count'),
        newCustomers:   buildKpiCard('Khách hàng mới', curNew, prevNew, 'count'),
        repeatRate:     buildKpiCard('Tỉ lệ mua lại', curRepeat, 0, 'percent'),
        avgClv:         buildKpiCard('CLV trung bình', curAvgClv, 0, 'vnd'),
      },
      acquisitionSeries: acquisitionRows.map(r => ({ date: r.date, value: Number(r.cnt) })),
      rfmSegments,
      topCustomers,
      retentionByMonth,
    };
  }
}
