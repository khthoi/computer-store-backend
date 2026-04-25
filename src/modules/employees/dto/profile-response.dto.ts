import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Shapes matching frontend src/types/employee.types.ts : NhanVien ─────────

export class NhanVienProfileDto {
  @ApiProperty({ example: '1' }) id: string;
  @ApiProperty({ example: 'NV001' }) code: string;
  @ApiProperty({ example: 'Nguyễn Văn A' }) fullName: string;
  @ApiProperty({ example: 'a@store.vn' }) email: string;
  @ApiProperty({ example: '0901234567' }) phone: string;
  @ApiPropertyOptional({ example: null, nullable: true }) avatarUrl: string | null;
  @ApiPropertyOptional({ enum: ['male', 'female', 'other'], nullable: true }) gender: 'male' | 'female' | 'other' | null;
  @ApiPropertyOptional({ example: '1990-01-15', nullable: true }) dateOfBirth: string | null;
  @ApiProperty({ type: [String], example: ['1'] }) roleIds: string[];
  @ApiProperty({ type: [String], example: ['admin'] }) roleNames: string[];
  @ApiProperty({ enum: ['active', 'inactive', 'suspended'] }) status: 'active' | 'inactive' | 'suspended';
  @ApiProperty({ example: '2024-01-10' }) hireDate: string;
  @ApiPropertyOptional({ example: null, nullable: true }) lastLoginAt: string | null;
  @ApiProperty({ example: '2024-01-10T08:00:00.000Z' }) createdAt: string;
}

// ─── Shapes matching frontend src/types/role.types.ts : VaiTro ───────────────

export class VaiTroProfileDto {
  @ApiProperty({ example: '1' }) id: string;
  @ApiProperty({ example: 'admin' }) name: string;
  @ApiProperty({ example: 'Quản trị viên' }) description: string;
  @ApiProperty({ type: [String] }) permissions: string[];
  @ApiProperty({ example: 0 }) employeeCount: number;
  @ApiProperty({ type: [Object], default: [] }) assignments: [];
  @ApiProperty({ example: '' }) createdAt: string;
}

// ─── Shapes matching frontend src/types/employee.types.ts : AuditLogEntry ────

export class AuditLogEntryDto {
  @ApiProperty({ example: '1' }) id: string;
  @ApiProperty({ example: 'profile_edit' }) action: string;
  @ApiProperty({ example: 'Cập nhật thông tin cá nhân' }) details: string;
  @ApiProperty({ example: '127.0.0.1' }) ipAddress: string;
  @ApiProperty({ example: '2024-01-10T08:00:00.000Z' }) createdAt: string;
}

// ─── Full profile payload (GET /admin/me) ─────────────────────────────────────

export class ProfileDataDto {
  @ApiProperty({ type: NhanVienProfileDto }) employee: NhanVienProfileDto;
  @ApiProperty({ type: [VaiTroProfileDto] }) roles: VaiTroProfileDto[];
  @ApiProperty({ type: [AuditLogEntryDto] }) auditLogs: AuditLogEntryDto[];
}

export class AvatarResponseDto {
  @ApiProperty({ example: 'https://res.cloudinary.com/...' }) avatarUrl: string;
}
