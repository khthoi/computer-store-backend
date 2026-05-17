import { ApiProperty } from '@nestjs/swagger';

export class AuthEmployeeDto {
  @ApiProperty({ example: '2' }) id: string;
  @ApiProperty({ example: 'NV001' }) code: string;
  @ApiProperty({ example: 'admin@store.vn' }) email: string;
  @ApiProperty({ example: 'Trần Thị B' }) fullName: string;
  @ApiProperty({ example: null, nullable: true }) avatar: string | null;
  @ApiProperty({ example: ['admin', 'staff'] }) roles: string[];
  @ApiProperty({
    example: ['orders.read', 'orders.update', 'products.read'],
    description: 'Quyền hạn đã được resolve từ tất cả roles của nhân viên',
  })
  permissions: string[];
}
