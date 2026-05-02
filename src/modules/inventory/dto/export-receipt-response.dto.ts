export class ExportReceiptSummaryDto {
  id: string;
  receiptCode: string;
  loaiPhieu: string;
  loaiPhieuLabel: string;
  createdById: string;
  createdByCode: string;
  createdBy: string;
  lyDo: string;
  itemCount: number;
  totalQty: number;
  tongGiaVon: number;
  createdAt: string;
}

export class BatchDeductionDto {
  loId: string;
  maLo: string;
  soLuong: number;
  giaVon: number;
}

export class ExportReceiptLineItemDto {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  quantityExported: number;
  costPrice: number;
  totalCost: number;
  batchesDeducted: BatchDeductionDto[];
  note?: string;
}

export class ExportReceiptDetailDto extends ExportReceiptSummaryDto {
  ghiChu?: string;
  lineItems: ExportReceiptLineItemDto[];
}
