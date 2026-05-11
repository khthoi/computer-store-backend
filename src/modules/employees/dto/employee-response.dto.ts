import { ApiProperty } from '@nestjs/swagger';

export class EmployeeResponseDto {
  @ApiProperty({ example: '2' }) id: string;
  @ApiProperty({ example: 'NV-001' }) code: string;
  @ApiProperty({ example: 'Trần Thị B' }) fullName: string;
  @ApiProperty({ example: 'b@store.vn' }) email: string;
  @ApiProperty({ example: '0912345678', nullable: true }) phone: string | null;
  @ApiProperty({ example: null, nullable: true }) avatarUrl: string | null;
  @ApiProperty({ enum: ['male', 'female', 'other'], nullable: true }) gender: 'male' | 'female' | 'other' | null;
  @ApiProperty({ example: '1990-05-15', nullable: true }) dateOfBirth: string | null;
  @ApiProperty({ type: [String], example: ['1', '2'] }) roleIds: string[];
  @ApiProperty({ type: [String], example: ['Admin', 'Staff'] }) roleNames: string[];
  @ApiProperty({ enum: ['active', 'inactive'], example: 'active' }) status: 'active' | 'inactive';
  @ApiProperty({ example: '2024-01-10', nullable: true }) hireDate: string | null;
  @ApiProperty({ example: null, nullable: true }) lastLoginAt: string | null;
  @ApiProperty({ example: '2024-01-10T08:00:00.000Z' }) createdAt: string;
}

export class EmployeeListResponseDto {
  @ApiProperty({ type: [EmployeeResponseDto] }) data: EmployeeResponseDto[];
  @ApiProperty({ example: 15 }) total: number;
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 20 }) limit: number;
  @ApiProperty({ example: 1 }) totalPages: number;
}
