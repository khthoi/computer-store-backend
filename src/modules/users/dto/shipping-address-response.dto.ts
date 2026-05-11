import { ApiProperty } from '@nestjs/swagger';

export class ShippingAddressResponseDto {
  @ApiProperty({ example: '1' }) id: string;
  @ApiProperty({ example: '5' }) customerId: string;
  @ApiProperty({ example: 'Nguyễn Văn A' }) recipientName: string;
  @ApiProperty({ example: '0901234567' }) phone: string;
  @ApiProperty({ example: '123 Lê Lợi' }) addressLine: string;
  @ApiProperty({ example: '' }) ward: string;
  @ApiProperty({ example: 'Quận 1' }) district: string;
  @ApiProperty({ example: 'TP. Hồ Chí Minh' }) province: string;
  @ApiProperty({ example: true }) isDefault: boolean;
  @ApiProperty({ example: '' }) createdAt: string;
}
