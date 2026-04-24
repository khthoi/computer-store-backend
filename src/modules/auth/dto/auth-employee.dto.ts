import { ApiProperty } from '@nestjs/swagger';

export class AuthEmployeeDto {
  @ApiProperty({ example: 2 }) id: number;
  @ApiProperty({ example: 'NV001' }) maNhanVien: string;
  @ApiProperty({ example: 'admin@store.vn' }) email: string;
  @ApiProperty({ example: 'Trần Thị B' }) hoTen: string;
  @ApiProperty({ example: 'Female', nullable: true }) gioiTinh: string | null;
  @ApiProperty({ example: null, nullable: true }) anhDaiDien: string | null;
  @ApiProperty({ example: 'DangLam' }) trangThai: string;
  @ApiProperty({ example: '2024-01-10T08:00:00.000Z' }) ngayTao: Date;
  @ApiProperty({ example: null, nullable: true }) assetIdAvatar: number | null;
  @ApiProperty({ example: ['admin', 'staff'] }) roles: string[];
}
