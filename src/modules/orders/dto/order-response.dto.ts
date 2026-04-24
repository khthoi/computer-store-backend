import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 5 })
  variantId: number;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 15000000 })
  priceAtTime: number;

  @ApiProperty({ example: 30000000 })
  lineTotal: number;

  @ApiProperty({ example: 'Intel Core i9-14900K' })
  productNameSnapshot: string;

  @ApiProperty({ example: 'CPU-I9-14900K' })
  skuSnapshot: string;
}

export class OrderResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'ORD-20240115-1234' })
  orderCode: string;

  @ApiProperty({ example: 12 })
  customerId: number;

  @ApiProperty({ example: 3 })
  shippingAddressId: number;

  @ApiProperty({ example: 'ChoTT', enum: ['ChoTT', 'DaXacNhan', 'DongGoi', 'DangGiao', 'DaGiao', 'DaHuy', 'HoanTra'] })
  status: string;

  @ApiProperty({ example: 'GiaoChuan', enum: ['GiaoNhanh', 'GiaoChuan', 'NhanTaiCuaHang'] })
  shippingMethod: string;

  @ApiProperty({ example: 25000 })
  shippingFee: number;

  @ApiProperty({ example: 30000000 })
  subtotal: number;

  @ApiProperty({ example: 0 })
  discountAmount: number;

  @ApiProperty({ example: 30025000 })
  totalAmount: number;

  @ApiPropertyOptional({ example: 'Giao trước 5h chiều' })
  customerNote: string | null;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  orderedAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: [OrderItemResponseDto] })
  items?: OrderItemResponseDto[];
}
