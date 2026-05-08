import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  ReportPeriod, buildKpiCard, periodDays, daysAgoStr, todayStr,
} from './reports-agg.helpers';

export interface SupportReport {
  kpis: {
    totalTickets:   ReturnType<typeof buildKpiCard>;
    resolvedRate:   ReturnType<typeof buildKpiCard>;
    avgResolutionH: ReturnType<typeof buildKpiCard>;
    pendingReviews: ReturnType<typeof buildKpiCard>;
  };
  ticketsByStatus: { status: string; count: number }[];
  ticketTrendSeries: { date: string; value: number }[];
  avgResolutionSeries: { date: string; hours: number }[];
  reviewModerationQueue: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    hidden: number;
  };
  reviewRatingDistribution: { star: number; count: number }[];
  topIssueCategories: { category: string; count: number; avgResolutionH: number }[];
}

@Injectable()
export class ReportsAggSupportService {
  constructor(private readonly dataSource: DataSource) {}

  async computeSupport(period: ReportPeriod): Promise<SupportReport> {
    const days = periodDays(period);
    const today = todayStr();
    const curFrom = daysAgoStr(days);
    const prevFrom = daysAgoStr(days * 2);
    const prevTo = daysAgoStr(days + 1);

    const [totCur, totPrev, resolvedCur, resolvedPrev, avgHourRow, pendingRevRow] =
      await Promise.all([
        this.dataSource.query<{ cnt: string }[]>(`
          SELECT COUNT(*) AS cnt FROM ticket_khieu_nai
          WHERE DATE(ngay_tao) >= ? AND DATE(ngay_tao) <= ?
        `, [curFrom, today]),
        this.dataSource.query<{ cnt: string }[]>(`
          SELECT COUNT(*) AS cnt FROM ticket_khieu_nai
          WHERE DATE(ngay_tao) >= ? AND DATE(ngay_tao) <= ?
        `, [prevFrom, prevTo]),
        this.dataSource.query<{ resolved: string; total: string }[]>(`
          SELECT
            SUM(CASE WHEN trang_thai IN ('DaGiaiQuyet','DaDong') THEN 1 ELSE 0 END) AS resolved,
            COUNT(*) AS total
          FROM ticket_khieu_nai
          WHERE DATE(ngay_tao) >= ? AND DATE(ngay_tao) <= ?
        `, [curFrom, today]),
        this.dataSource.query<{ resolved: string; total: string }[]>(`
          SELECT
            SUM(CASE WHEN trang_thai IN ('DaGiaiQuyet','DaDong') THEN 1 ELSE 0 END) AS resolved,
            COUNT(*) AS total
          FROM ticket_khieu_nai
          WHERE DATE(ngay_tao) >= ? AND DATE(ngay_tao) <= ?
        `, [prevFrom, prevTo]),
        this.dataSource.query<{ avgH: string }[]>(`
          SELECT AVG(TIMESTAMPDIFF(SECOND, ngay_tao, resolved_at) / 3600.0) AS avgH
          FROM ticket_khieu_nai
          WHERE trang_thai IN ('DaGiaiQuyet','DaDong')
            AND resolved_at IS NOT NULL
            AND DATE(ngay_tao) >= ? AND DATE(ngay_tao) <= ?
        `, [curFrom, today]),
        this.dataSource.query<{ cnt: string }[]>(`
          SELECT COUNT(*) AS cnt FROM danh_gia_san_pham WHERE review_status = 'Pending'
        `),
      ]);

    const curTotal = Number(totCur[0]?.cnt ?? 0);
    const prevTotal = Number(totPrev[0]?.cnt ?? 0);
    const curResolved = Number(resolvedCur[0]?.resolved ?? 0);
    const curResTotal = Number(resolvedCur[0]?.total ?? 0);
    const prevResolved = Number(resolvedPrev[0]?.resolved ?? 0);
    const prevResTotal = Number(resolvedPrev[0]?.total ?? 0);
    const curResRate  = curResTotal > 0 ? (curResolved / curResTotal) * 100 : 0;
    const prevResRate = prevResTotal > 0 ? (prevResolved / prevResTotal) * 100 : 0;
    const curAvgH  = Math.round(Number(avgHourRow[0]?.avgH ?? 0) * 10) / 10;
    const pendingRev = Number(pendingRevRow[0]?.cnt ?? 0);

    const [statusRows, trendRows, resolutionRows, reviewQueueRow, ratingRows, issueRows] =
      await Promise.all([
        this.dataSource.query<{ status: string; count: string }[]>(`
          SELECT trang_thai AS status, COUNT(*) AS count
          FROM ticket_khieu_nai
          WHERE DATE(ngay_tao) >= ? AND DATE(ngay_tao) <= ?
          GROUP BY trang_thai
        `, [curFrom, today]),
        this.dataSource.query<{ date: string; cnt: string }[]>(`
          SELECT DATE(ngay_tao) AS date, COUNT(*) AS cnt
          FROM ticket_khieu_nai
          WHERE DATE(ngay_tao) >= ? AND DATE(ngay_tao) <= ?
          GROUP BY DATE(ngay_tao)
          ORDER BY date ASC
        `, [curFrom, today]),
        this.dataSource.query<{ date: string; avgH: string }[]>(`
          SELECT DATE(ngay_tao) AS date,
                 AVG(TIMESTAMPDIFF(SECOND, ngay_tao, resolved_at) / 3600.0) AS avgH
          FROM ticket_khieu_nai
          WHERE trang_thai IN ('DaGiaiQuyet','DaDong')
            AND resolved_at IS NOT NULL
            AND DATE(ngay_tao) >= ? AND DATE(ngay_tao) <= ?
          GROUP BY DATE(ngay_tao)
          ORDER BY date ASC
        `, [curFrom, today]),
        this.dataSource.query<{
          total: string; pending: string; approved: string; rejected: string; hidden: string;
        }[]>(`
          SELECT COUNT(*) AS total,
                 SUM(review_status = 'Pending') AS pending,
                 SUM(review_status = 'Approved') AS approved,
                 SUM(review_status = 'Rejected') AS rejected,
                 SUM(review_status = 'Hidden') AS hidden
          FROM danh_gia_san_pham
        `),
        this.dataSource.query<{ star: string; cnt: string }[]>(`
          SELECT rating AS star, COUNT(*) AS cnt
          FROM danh_gia_san_pham
          WHERE review_status = 'Approved'
            AND DATE(created_at) >= ? AND DATE(created_at) <= ?
          GROUP BY rating
          ORDER BY rating ASC
        `, [curFrom, today]),
        this.dataSource.query<{ category: string; count: string; avgH: string }[]>(`
          SELECT loai_van_de AS category, COUNT(*) AS count,
                 AVG(CASE WHEN resolved_at IS NOT NULL
                     THEN TIMESTAMPDIFF(SECOND, ngay_tao, resolved_at) / 3600.0
                     ELSE NULL END) AS avgH
          FROM ticket_khieu_nai
          WHERE DATE(ngay_tao) >= ? AND DATE(ngay_tao) <= ?
          GROUP BY loai_van_de
          ORDER BY count DESC
        `, [curFrom, today]),
      ]);

    const qRow = reviewQueueRow[0] ?? { total: '0', pending: '0', approved: '0', rejected: '0', hidden: '0' };

    return {
      kpis: {
        totalTickets:   buildKpiCard('Tổng ticket', curTotal, prevTotal, 'count'),
        resolvedRate:   buildKpiCard('Tỉ lệ giải quyết', curResRate, prevResRate, 'percent'),
        avgResolutionH: buildKpiCard('TG xử lý TB (h)', curAvgH, 0),
        pendingReviews: buildKpiCard('Đánh giá chờ duyệt', pendingRev, 0, 'count'),
      },
      ticketsByStatus: statusRows.map(r => ({ status: r.status, count: Number(r.count) })),
      ticketTrendSeries: trendRows.map(r => ({ date: r.date, value: Number(r.cnt) })),
      avgResolutionSeries: resolutionRows.map(r => ({
        date: r.date,
        hours: Math.round(Number(r.avgH) * 10) / 10,
      })),
      reviewModerationQueue: {
        total:    Number(qRow.total),
        pending:  Number(qRow.pending),
        approved: Number(qRow.approved),
        rejected: Number(qRow.rejected),
        hidden:   Number(qRow.hidden),
      },
      reviewRatingDistribution: [1, 2, 3, 4, 5].map(star => {
        const found = ratingRows.find(r => Number(r.star) === star);
        return { star, count: Number(found?.cnt ?? 0) };
      }),
      topIssueCategories: issueRows.map(r => ({
        category:      r.category,
        count:         Number(r.count),
        avgResolutionH: Math.round(Number(r.avgH ?? 0) * 10) / 10,
      })),
    };
  }
}
