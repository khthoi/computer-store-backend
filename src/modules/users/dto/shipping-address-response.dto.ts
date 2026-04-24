import { ApiProperty } from '@nestjs/swagger';

export class ShippingAddressResponseDto {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: 'Nguyễn Văn A' }) hoTenNguoiNhan: string;
  @ApiProperty({ example: '0901234567' }) soDienThoaiNhan: string;
  @ApiProperty({ example: '123 Lê Lợi' }) diaChiChiTiet: string;
  @ApiProperty({ example: 'Quận 1' }) quanHuyen: string;
  @ApiProperty({ example: 'TP. Hồ Chí Minh' }) tinhThanhPho: string;
  @ApiProperty({ example: true }) laMacDinh: boolean;
}
