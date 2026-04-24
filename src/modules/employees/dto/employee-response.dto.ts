import { ApiProperty } from '@nestjs/swagger';

export class RoleInEmployeeDto {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: 'staff' }) name: string;
}

export class EmployeeResponseDto {
  @ApiProperty({ example: 2 }) id: number;
  @ApiProperty({ example: 'NV001' }) maNhanVien: string;
  @ApiProperty({ example: 'b@store.vn' }) email: string;
  @ApiProperty({ example: 'Trần Thị B' }) hoTen: string;
  @ApiProperty({ example: 'Female', nullable: true }) gioiTinh: string | null;
  @ApiProperty({ example: null, nullable: true }) anhDaiDien: string | null;
  @ApiProperty({ example: 'DangLam' }) trangThai: string;
  @ApiProperty({ example: '2024-01-10T08:00:00.000Z' }) ngayTao: Date;
  @ApiProperty({ example: null, nullable: true }) assetIdAvatar: number | null;
  @ApiProperty({ type: [RoleInEmployeeDto] }) roles: RoleInEmployeeDto[];
}

export class EmployeeListResponseDto {
  @ApiProperty({ type: [EmployeeResponseDto] }) items: EmployeeResponseDto[];
  @ApiProperty({ example: 15 }) total: number;
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 20 }) limit: number;
}
