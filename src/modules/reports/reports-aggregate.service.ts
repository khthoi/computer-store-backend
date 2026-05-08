import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import {
  AGG_CACHE_KEYS, ReportPeriod, secondsUntilMidnight,
} from './reports-agg.helpers';
import { ReportsAggRevenueService }    from './reports-agg-revenue.service';
import { ReportsAggProductsService }   from './reports-agg-products.service';
import { ReportsAggCustomersService }  from './reports-agg-customers.service';
import { ReportsAggInventoryService }  from './reports-agg-inventory.service';
import { ReportsAggPromotionsService } from './reports-agg-promotions.service';
import { ReportsAggSupportService }    from './reports-agg-support.service';

const PERIODS: ReportPeriod[] = ['7d', '30d', '90d', '1y'];

@Injectable()
export class ReportsAggregateService {
  constructor(
    private readonly redis: RedisService,
    private readonly revenueService: ReportsAggRevenueService,
    private readonly productsService: ReportsAggProductsService,
    private readonly customersService: ReportsAggCustomersService,
    private readonly inventoryService: ReportsAggInventoryService,
    private readonly promotionsService: ReportsAggPromotionsService,
    private readonly supportService: ReportsAggSupportService,
  ) {}

  getRevenue(period: ReportPeriod) {
    const ttl = secondsUntilMidnight();
    return this.redis.cache(AGG_CACHE_KEYS.revenue(period), ttl, () =>
      this.revenueService.computeRevenue(period),
    );
  }

  getProducts(period: ReportPeriod) {
    const ttl = secondsUntilMidnight();
    return this.redis.cache(AGG_CACHE_KEYS.products(period), ttl, () =>
      this.productsService.computeProducts(period),
    );
  }

  getCustomers(period: ReportPeriod) {
    const ttl = secondsUntilMidnight();
    return this.redis.cache(AGG_CACHE_KEYS.customers(period), ttl, () =>
      this.customersService.computeCustomers(period),
    );
  }

  getInventory() {
    const ttl = secondsUntilMidnight();
    return this.redis.cache(AGG_CACHE_KEYS.inventory(), ttl, () =>
      this.inventoryService.computeInventory(),
    );
  }

  getPromotions(period: ReportPeriod) {
    const ttl = secondsUntilMidnight();
    return this.redis.cache(AGG_CACHE_KEYS.promotions(period), ttl, () =>
      this.promotionsService.computePromotions(period),
    );
  }

  getSupport(period: ReportPeriod) {
    const ttl = secondsUntilMidnight();
    return this.redis.cache(AGG_CACHE_KEYS.support(period), ttl, () =>
      this.supportService.computeSupport(period),
    );
  }

  async getExecutive(period: ReportPeriod) {
    const ttl = secondsUntilMidnight();
    return this.redis.cache(AGG_CACHE_KEYS.executive(period), ttl, async () => {
      const [revenue, products, customers, inventory, promotions, support] = await Promise.all([
        this.revenueService.computeRevenue(period),
        this.productsService.computeProducts(period),
        this.customersService.computeCustomers(period),
        this.inventoryService.computeInventory(),
        this.promotionsService.computePromotions(period),
        this.supportService.computeSupport(period),
      ]);
      return {
        period,
        revenue:    { kpis: revenue.kpis,   gmvSeries: revenue.gmvSeries },
        products:   { kpis: products.kpis },
        customers:  { kpis: customers.kpis, acquisitionSeries: customers.acquisitionSeries },
        inventory:  { kpis: inventory.kpis, stockHealthBuckets: inventory.stockHealthBuckets },
        promotions: { kpis: promotions.kpis },
        support:    { kpis: support.kpis },
      };
    });
  }

  /** Called by the nightly REPORT_AGGREGATION cron job — warms all period caches. */
  async computeAllAggregations(): Promise<void> {
    const TTL_24H = 24 * 60 * 60;

    const inventory = await this.inventoryService.computeInventory();
    await this.redis.set(AGG_CACHE_KEYS.inventory(), JSON.stringify(inventory), TTL_24H);

    for (const period of PERIODS) {
      const [revenue, products, customers, promotions, support] = await Promise.all([
        this.revenueService.computeRevenue(period),
        this.productsService.computeProducts(period),
        this.customersService.computeCustomers(period),
        this.promotionsService.computePromotions(period),
        this.supportService.computeSupport(period),
      ]);

      const executive = {
        period,
        revenue:    { kpis: revenue.kpis,    gmvSeries: revenue.gmvSeries },
        products:   { kpis: products.kpis },
        customers:  { kpis: customers.kpis,  acquisitionSeries: customers.acquisitionSeries },
        inventory:  { kpis: inventory.kpis,  stockHealthBuckets: inventory.stockHealthBuckets },
        promotions: { kpis: promotions.kpis },
        support:    { kpis: support.kpis },
      };

      await Promise.all([
        this.redis.set(AGG_CACHE_KEYS.revenue(period),    JSON.stringify(revenue),    TTL_24H),
        this.redis.set(AGG_CACHE_KEYS.products(period),   JSON.stringify(products),   TTL_24H),
        this.redis.set(AGG_CACHE_KEYS.customers(period),  JSON.stringify(customers),  TTL_24H),
        this.redis.set(AGG_CACHE_KEYS.promotions(period), JSON.stringify(promotions), TTL_24H),
        this.redis.set(AGG_CACHE_KEYS.support(period),    JSON.stringify(support),    TTL_24H),
        this.redis.set(AGG_CACHE_KEYS.executive(period),  JSON.stringify(executive),  TTL_24H),
      ]);
    }
  }
}
