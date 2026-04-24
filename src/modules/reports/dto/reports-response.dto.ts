import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DailyRevenueRowDto {
  @ApiProperty({ example: '2024-01-15' }) date: string;
  @ApiProperty({ example: 50000000 }) gmv: number;
  @ApiProperty({ example: 47000000 }) netRevenue: number;
  @ApiProperty({ example: 3000000 }) totalDiscount: number;
  @ApiProperty({ example: 500000 }) shippingFee: number;
  @ApiProperty({ example: 12 }) ordersPlaced: number;
  @ApiProperty({ example: 10 }) ordersCompleted: number;
  @ApiProperty({ example: 1 }) ordersCancelled: number;
  @ApiProperty({ example: 1 }) ordersReturned: number;
  @ApiProperty({ example: 4166666 }) avgOrderValue: number;
  @ApiProperty({ example: 5 }) newCustomers: number;
  @ApiProperty({ example: 7 }) returningCustomers: number;
}

export class RevenueSummaryDto {
  @ApiProperty({ example: 1500000000 }) totalGmv: number;
  @ApiProperty({ example: 1410000000 }) totalNetRevenue: number;
  @ApiProperty({ example: 360 }) totalOrders: number;
  @ApiProperty({ example: 300 }) totalCompleted: number;
}

export class RevenueResponseDto {
  @ApiProperty({ type: RevenueSummaryDto }) summary: RevenueSummaryDto;
  @ApiProperty({ type: [DailyRevenueRowDto] }) data: DailyRevenueRowDto[];
}

export class TopProductDto {
  @ApiProperty({ example: 5 }) variantId: number;
  @ApiProperty({ example: 'CPU-I9-14900K' }) sku: string;
  @ApiProperty({ example: 'Intel Core i9-14900K Box' }) variantName: string;
  @ApiProperty({ example: 'Intel Core i9-14900K' }) productName: string;
  @ApiProperty({ example: 150 }) totalSold: number;
  @ApiProperty({ example: 2250000000 }) totalRevenue: number;
}

export class RfmSummaryRowDto {
  @ApiProperty({ example: 'Champions' }) segment: string;
  @ApiProperty({ example: 42 }) count: number;
  @ApiProperty({ example: 5000000 }) avgMonetary: number;
}

export class RfmCustomerDto {
  @ApiProperty({ example: 12 }) customerId: number;
  @ApiProperty({ example: 'Nguyễn Văn A' }) fullName: string;
  @ApiProperty({ example: 'a@example.com' }) email: string;
  @ApiProperty({ example: 15 }) recencyDays: number;
  @ApiProperty({ example: 8 }) frequency: number;
  @ApiProperty({ example: 12000000 }) monetary: number;
  @ApiProperty({ example: 5 }) rScore: number;
  @ApiProperty({ example: 4 }) fScore: number;
  @ApiProperty({ example: 5 }) mScore: number;
  @ApiProperty({ example: 'Champions' }) segment: string;
}

export class InventoryHealthRowDto {
  @ApiProperty({ example: 5 }) variantId: number;
  @ApiProperty({ example: 'CPU-I9-14900K' }) sku: string;
  @ApiProperty({ example: 'Intel Core i9-14900K Box' }) variantName: string;
  @ApiProperty({ example: 'Intel Core i9-14900K' }) productName: string;
  @ApiProperty({ example: 25 }) stockQty: number;
  @ApiProperty({ example: 2.5 }) avgDailySold30d: number;
  @ApiProperty({ example: 10 }) daysOfInventory: number;
  @ApiProperty({ example: 'tot', enum: ['het_hang', 'thap', 'tot', 'ton_kho'] }) bucket: string;
  @ApiProperty({ example: 375000000 }) estimatedStockValue: number;
  @ApiPropertyOptional({ example: '2024-01-14' }) lastSoldDate: string | null;
}

export class RetentionCohortDto {
  @ApiProperty({ example: '2024-01' }) cohortMonth: string;
  @ApiProperty({ example: 100 }) initialCustomers: number;
  @ApiProperty({ example: 100 }) m0: number;
  @ApiPropertyOptional({ example: 45 }) m1: number | null;
  @ApiPropertyOptional({ example: 30 }) m2: number | null;
  @ApiPropertyOptional({ example: 25 }) m3: number | null;
}

export class JobLogDto {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: 'daily_revenue' }) jobName: string;
  @ApiProperty({ example: 'success', enum: ['running', 'success', 'failed'] }) status: string;
  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' }) startedAt: Date;
  @ApiPropertyOptional({ example: '2024-01-15T10:30:05.000Z' }) finishedAt: Date | null;
  @ApiPropertyOptional({ example: 4823 }) durationMs: number | null;
  @ApiPropertyOptional({ example: 30 }) rowsProcessed: number | null;
  @ApiPropertyOptional({ example: null }) errorMessage: string | null;
}
