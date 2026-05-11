import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MaxLength,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'NV-001' })
  @IsString()
  @MaxLength(255)
  code: string;

  @ApiProperty({ example: 'Nguyễn Văn B' })
  @IsString()
  @MaxLength(255)
  fullName: string;

  @ApiProperty({ example: 'nhanvien@store.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: 'male' | 'female' | 'other';

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: '2024-01-10' })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiPropertyOptional({ type: [Number], example: [1, 2] })
  @IsOptional()
  @Transform(({ value }) => Array.isArray(value) ? value.map(Number) : [])
  @IsArray()
  @IsInt({ each: true })
  roleIds?: number[];
}
// Không có matKhau — backend tự sinh và gửi email
