import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class InventoryItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() productId: string;
  @ApiProperty() variantId: string;
  @ApiProperty() productName: string;
  @ApiProperty() variantName: string;
  @ApiProperty() sku: string;
  @ApiPropertyOptional() thumbnailUrl?: string;
  @ApiPropertyOptional() supplierId?: string;
  @ApiPropertyOptional() supplierName?: string;
  @ApiProperty() quantityOnHand: number;
  @ApiProperty() quantityReserved: number;
  @ApiProperty() quantityAvailable: number;
  @ApiProperty() lowStockThreshold: number;
  @ApiProperty() costPrice: number;
  @ApiProperty() sellingPrice: number;
  @ApiPropertyOptional() location?: string;
  @ApiProperty({ default: 0 }) locationCount: number;
  @ApiPropertyOptional() locationDetail?: string;
  @ApiProperty({ enum: ['ok', 'low_stock', 'out_of_stock_inv'] }) alertLevel: string;
  @ApiPropertyOptional() lastRestockedAt?: string;
  @ApiProperty() updatedAt: string;
}

export class InventorySummaryDto {
  @ApiProperty() totalSkus: number;
  @ApiProperty() totalUnits: number;
  @ApiProperty() lowStockCount: number;
  @ApiProperty() outOfStockCount: number;
  @ApiProperty() totalInventoryValue: number;
  @ApiProperty() pendingStockIn: number;
  @ApiProperty() pendingReturns: number;
}

export class UpdateThresholdsDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  lowStockThreshold: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  reorderPoint: number;
}

export class StockBatchResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() maLo: string;
  @ApiProperty() variantId: string;
  @ApiProperty() importReceiptId: string;
  @ApiProperty() receiptCode: string;
  @ApiProperty() quantityImported: number;
  @ApiProperty() quantityRemaining: number;
  @ApiProperty() costPrice: number;
  @ApiProperty() importedAt: string;
  @ApiPropertyOptional() expiresAt?: string;
  @ApiPropertyOptional() note?: string;
  @ApiPropertyOptional() createdBy?: string;
  @ApiPropertyOptional() createdByCode?: string;
  // Variant / product info — populated by getBatchesByVariant
  @ApiPropertyOptional() productId?: string;
  @ApiPropertyOptional() productName?: string;
  @ApiPropertyOptional() variantName?: string;
  @ApiPropertyOptional() sku?: string;
  @ApiPropertyOptional() sellingPrice?: number;
  @ApiPropertyOptional() thumbnailUrl?: string;
  @ApiProperty({ enum: ['con_hang', 'da_het'] }) trangThai: string;
  /** True for the oldest batch with remaining stock — next to be deducted by FIFO */
  @ApiPropertyOptional() isNextFifo?: boolean;
}
