import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuccessOrderRecipientDto {
  @ApiProperty({ example: 'Nguyễn Văn An' }) fullName: string;
  @ApiProperty({ example: '0901234567' }) phone: string;
  @ApiProperty({ example: 'an@example.com' }) email: string;
  @ApiProperty({ example: 'Hà Nội' }) province: string;
  @ApiProperty({ example: 'Cầu Giấy' }) district: string;
  @ApiProperty({ example: 'Dịch Vọng' }) ward: string;
  @ApiProperty({ example: 'Số 10, ngõ 5' }) addressDetail: string;
}

export class SuccessShippingMethodDto {
  @ApiProperty({ example: 'GiaoChuan' }) id: string;
  @ApiProperty({ example: 'Giao hàng tiêu chuẩn' }) name: string;
  @ApiProperty({ example: 25000 }) price: number;
}

export class SuccessPaymentMethodDto {
  @ApiProperty({ example: 'vnpay' }) id: string;
  @ApiProperty({ example: 'VNPay' }) name: string;
  @ApiProperty({ example: 'paid', enum: ['unpaid', 'paid', 'refunded'] }) status: string;
}

export class SuccessItemFlashSaleDto {
  @ApiProperty({ example: 12 }) id: number;
  @ApiProperty({ example: 'Flash sale 8/3' }) name: string;
}

export class SuccessOrderItemDto {
  @ApiProperty({ example: '101-12' }) id: string;
  @ApiProperty({ example: 'Laptop Asus ROG' }) name: string;
  @ApiProperty({ example: 'laptop-asus-rog' }) slug: string;
  @ApiProperty({ example: 'https://...' }) thumbnailSrc: string;
  @ApiProperty({ example: 'ASUS' }) brand: string;
  @ApiProperty({ example: 'RAM 16GB / SSD 512GB' }) variantLabel: string;
  @ApiProperty({ example: 1 }) quantity: number;
  @ApiProperty({ example: 28990000 }) currentPrice: number;
  @ApiProperty({ example: 32990000 }) originalPrice: number;
  @ApiProperty({ example: 12 }) discountPct: number;
  @ApiPropertyOptional({ type: SuccessItemFlashSaleDto }) flashSale?: SuccessItemFlashSaleDto | null;
}

export class SuccessAppliedPromotionDto {
  @ApiPropertyOptional({ example: 42 }) id?: number | null;
  @ApiProperty({ example: 'Flash sale 8/3' }) name: string;
  @ApiProperty({ example: 'flashsale', enum: ['coupon', 'auto', 'flashsale'] }) type: string;
  @ApiProperty({ example: 1200000 }) amount: number;
  @ApiPropertyOptional({ example: 'TECH10' }) maCoupon?: string | null;
}

export class SuccessPricingDto {
  @ApiProperty({ example: 60760000 }) subtotal: number;
  @ApiProperty({ example: 6700000 }) savings: number;
  @ApiPropertyOptional({ example: 'TECH10' }) couponCode?: string | null;
  @ApiProperty({ example: 6076000 }) couponDiscount: number;
  @ApiProperty({ type: [SuccessAppliedPromotionDto] }) appliedPromotions: SuccessAppliedPromotionDto[];
  @ApiProperty({ example: 30000 }) shippingFee: number;
  @ApiProperty({ example: 54714000 }) total: number;
}

export class SuccessOrderSummaryDto {
  @ApiProperty({ example: 'ORD-20260516-0001' }) id: string;
  @ApiProperty({ example: 101 }) numericId: number;
  @ApiProperty({ example: '2026-05-16T10:30:00.000Z' }) placedAt: string;
  @ApiProperty({ example: '20–22 tháng 5, 2026' }) estimatedDelivery: string;
  @ApiProperty({ example: '2026-05-20' }) estimatedDeliveryIso: string;
  @ApiProperty({ example: 'an@example.com' }) customerEmail: string;
  @ApiProperty({ type: SuccessOrderRecipientDto }) recipient: SuccessOrderRecipientDto;
  @ApiProperty({ type: SuccessShippingMethodDto }) shippingMethod: SuccessShippingMethodDto;
  @ApiProperty({ type: SuccessPaymentMethodDto }) paymentMethod: SuccessPaymentMethodDto;
  @ApiProperty({ type: [SuccessOrderItemDto] }) items: SuccessOrderItemDto[];
  @ApiProperty({ type: SuccessPricingDto }) pricing: SuccessPricingDto;
}
