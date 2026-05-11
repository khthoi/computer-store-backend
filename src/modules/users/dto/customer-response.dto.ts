import { ApiProperty } from '@nestjs/swagger';
import { ShippingAddressResponseDto } from './shipping-address-response.dto';

export class CustomerProfileResponseDto {
  @ApiProperty({ example: '5' }) id: string;
  @ApiProperty({ example: 'KH-0005' }) code: string;
  @ApiProperty({ example: 'nguyenvana@gmail.com' }) email: string;
  @ApiProperty({ example: 'Nguyễn Văn A' }) fullName: string;
  @ApiProperty({ example: '0901234567', nullable: true }) phone: string | null;
  @ApiProperty({ example: 'male', nullable: true }) gender: string | null;
  @ApiProperty({ example: '1990-01-15', nullable: true }) dateOfBirth: string | null;
  @ApiProperty({ example: null, nullable: true }) avatarUrl: string | null;
  @ApiProperty({ example: 'active' }) status: string;
  @ApiProperty({ example: '2024-01-15T08:00:00.000Z' }) registeredAt: string;
  @ApiProperty({ example: false }) emailVerified: boolean;
  @ApiProperty({ example: 1200 }) points: number;
  @ApiProperty({ example: null, nullable: true }) assetIdAvatar: number | null;
  @ApiProperty({ example: 0 }) totalOrders: number;
  @ApiProperty({ example: 0 }) totalSpent: number;
  @ApiProperty({ example: null, nullable: true }) lastOrderAt: string | null;
}

export class CustomerListItemResponseDto {
  @ApiProperty({ example: '5' }) id: string;
  @ApiProperty({ example: 'KH-0005' }) code: string;
  @ApiProperty({ example: 'nguyenvana@gmail.com' }) email: string;
  @ApiProperty({ example: 'Nguyễn Văn A' }) fullName: string;
  @ApiProperty({ example: '0901234567', nullable: true }) phone: string | null;
  @ApiProperty({ example: 'male', nullable: true }) gender: string | null;
  @ApiProperty({ example: '1990-01-15', nullable: true }) dateOfBirth: string | null;
  @ApiProperty({ example: 'active' }) status: string;
  @ApiProperty({ example: '2024-01-15T08:00:00.000Z' }) registeredAt: string;
  @ApiProperty({ example: 1200 }) points: number;
  @ApiProperty({ example: 0 }) totalOrders: number;
  @ApiProperty({ example: 0 }) totalSpent: number;
  @ApiProperty({ example: null, nullable: true }) lastOrderAt: string | null;
  @ApiProperty({ type: [ShippingAddressResponseDto] }) shippingAddresses: ShippingAddressResponseDto[];
}

export class CustomerDetailResponseDto extends CustomerProfileResponseDto {
  @ApiProperty({ type: [ShippingAddressResponseDto] }) shippingAddresses: ShippingAddressResponseDto[];
}

export class CustomerListResponseDto {
  @ApiProperty({ type: [CustomerListItemResponseDto] }) data: CustomerListItemResponseDto[];
  @ApiProperty({ example: 120 }) total: number;
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 20 }) limit: number;
  @ApiProperty({ example: 6 }) totalPages: number;
}
