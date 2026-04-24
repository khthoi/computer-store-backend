import { ApiProperty } from '@nestjs/swagger';
import { ShippingAddressResponseDto } from './shipping-address-response.dto';

export class CustomerProfileResponseDto {
  @ApiProperty({ example: 5 }) id: number;
  @ApiProperty({ example: 'nguyenvana@gmail.com' }) email: string;
  @ApiProperty({ example: 'Nguyễn Văn A' }) hoTen: string;
  @ApiProperty({ example: '0901234567', nullable: true }) soDienThoai: string | null;
  @ApiProperty({ example: 'Nam', nullable: true }) gioiTinh: string | null;
  @ApiProperty({ example: '1990-01-15', nullable: true }) ngaySinh: Date | null;
  @ApiProperty({ example: null, nullable: true }) anhDaiDien: string | null;
  @ApiProperty({ example: 'HoatDong' }) trangThai: string;
  @ApiProperty({ example: '2024-01-15T08:00:00.000Z' }) ngayDangKy: Date;
  @ApiProperty({ example: false }) xacMinhEmail: boolean;
  @ApiProperty({ example: 1200 }) diemHienTai: number;
  @ApiProperty({ example: null, nullable: true }) assetIdAvatar: number | null;
}

export class CustomerListItemResponseDto {
  @ApiProperty({ example: 5 }) id: number;
  @ApiProperty({ example: 'nguyenvana@gmail.com' }) email: string;
  @ApiProperty({ example: 'Nguyễn Văn A' }) hoTen: string;
  @ApiProperty({ example: '0901234567', nullable: true }) soDienThoai: string | null;
  @ApiProperty({ example: 'HoatDong' }) trangThai: string;
  @ApiProperty({ example: '2024-01-15T08:00:00.000Z' }) ngayDangKy: Date;
  @ApiProperty({ example: 1200 }) diemHienTai: number;
}

export class CustomerDetailResponseDto extends CustomerProfileResponseDto {
  @ApiProperty({ type: [ShippingAddressResponseDto] }) addresses: ShippingAddressResponseDto[];
}

export class CustomerListResponseDto {
  @ApiProperty({ type: [CustomerListItemResponseDto] }) items: CustomerListItemResponseDto[];
  @ApiProperty({ example: 120 }) total: number;
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 20 }) limit: number;
}
