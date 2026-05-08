export type ReportPeriod = '7d' | '30d' | '90d' | '1y';

export interface KpiCard {
  label: string;
  value: number;
  unit?: string;
  change: number;
  trend: 'up' | 'down' | 'flat';
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export function buildKpiCard(
  label: string,
  value: number,
  previousValue: number,
  unit?: string,
): KpiCard {
  const change =
    previousValue === 0 ? 0 : ((value - previousValue) / previousValue) * 100;
  const rounded = Math.round(change * 10) / 10;
  return {
    label,
    value,
    unit,
    change: rounded,
    trend: rounded > 0.5 ? 'up' : rounded < -0.5 ? 'down' : 'flat',
  };
}

export function periodDays(period: ReportPeriod): number {
  return { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[period];
}

export function daysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function secondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  return Math.max(60, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

export const AGG_CACHE_KEYS = {
  executive:  (p: string) => `reports:agg:executive:${p}`,
  revenue:    (p: string) => `reports:agg:revenue:${p}`,
  products:   (p: string) => `reports:agg:products:${p}`,
  customers:  (p: string) => `reports:agg:customers:${p}`,
  inventory:  ()          => `reports:agg:inventory`,
  promotions: (p: string) => `reports:agg:promotions:${p}`,
  support:    (p: string) => `reports:agg:support:${p}`,
};
