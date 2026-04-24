import { ApiProperty } from '@nestjs/swagger';

export class AuthCustomerDto {
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
