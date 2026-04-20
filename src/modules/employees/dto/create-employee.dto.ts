import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
} from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'NV001' })
  @IsString()
  @MaxLength(255)
  maNhanVien: string;

  @ApiProperty({ example: 'nhanvien@store.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Nguyễn Văn B' })
  @IsString()
  @MaxLength(255)
  hoTen: string;

  @ApiPropertyOptional({ enum: ['Male', 'Female', 'Undefined'] })
  @IsOptional()
  @IsEnum(['Male', 'Female', 'Undefined'])
  gioiTinh?: string;

  @ApiProperty({ example: 'Passw0rd!', minLength: 6 })
  @IsString()
  @MinLength(6)
  matKhau: string;

  @ApiPropertyOptional({ type: [Number], example: [1, 2] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  roleIds?: number[];
}
