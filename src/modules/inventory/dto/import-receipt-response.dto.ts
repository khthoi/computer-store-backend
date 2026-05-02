import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportReceiptItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() productId: string;
  @ApiProperty() variantId: string;
  @ApiProperty() productName: string;
  @ApiProperty() variantName: string;
  @ApiProperty() sku: string;
  @ApiProperty() quantityOrdered: number;
  @ApiProperty() quantityReceived: number;
  @ApiProperty({ description: 'Số lượng hư hỏng' }) quantityDamaged: number;
  @ApiProperty({ description: 'Số lượng còn thiếu so với đơn đặt (= ordered - (received - damaged))' }) quantityShort: number;
  @ApiProperty() costPrice: number;
  @ApiPropertyOptional() sellingPrice?: number;
  @ApiPropertyOptional() note?: string;
}

export class ImportReceiptSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() receiptCode: string;
  @ApiProperty() supplierId: string;
  @ApiProperty() supplierName: string;
  @ApiProperty({ enum: ['pending', 'received', 'partial', 'cancelled'] }) status: string;
  @ApiProperty() itemCount: number;
  @ApiProperty() totalCost: number;
  @ApiProperty() expectedDate: string;
  @ApiProperty({ nullable: true }) receivedDate: string | null;
  @ApiProperty() createdById: string;
  @ApiProperty() createdByCode: string;
  @ApiProperty() createdBy: string;
  @ApiProperty() createdAt: string;
  @ApiPropertyOptional() predecessorId?: string;
  @ApiPropertyOptional() predecessorCode?: string;
  @ApiPropertyOptional() successorId?: string;
  @ApiPropertyOptional() successorCode?: string;
}

export class ImportReceiptDetailDto extends ImportReceiptSummaryDto {
  @ApiProperty({ type: [ImportReceiptItemResponseDto] }) lineItems: ImportReceiptItemResponseDto[];
  @ApiPropertyOptional() note?: string;
  @ApiProperty() updatedAt: string;
}
