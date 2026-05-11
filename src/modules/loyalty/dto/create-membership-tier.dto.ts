import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, MaxLength, IsInt, Min, IsOptional, IsBoolean, Matches,
} from 'class-validator';

export class CreateMembershipTierDto {
  @ApiProperty({ example: 'Hạng Vàng', description: 'Tên hiển thị bậc (phải là duy nhất)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName: string;

  @ApiProperty({ example: 3000, description: 'Điểm tối thiểu để vào bậc (≥ 0)' })
  @IsInt()
  @Min(0)
  minPoints: number;

  @ApiPropertyOptional({
    example: 4999,
    nullable: true,
    description: 'Điểm tối đa (inclusive). null = không giới hạn (chỉ một bậc được phép)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxPoints?: number | null;

  @ApiPropertyOptional({ example: '#FFD700', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{3,6}$|^$/, { message: 'Màu sắc phải là mã hex hợp lệ (VD: #FFD700)' })
  color?: string | null;

  @ApiPropertyOptional({ example: 'Đặc quyền dành riêng cho hạng Vàng', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
