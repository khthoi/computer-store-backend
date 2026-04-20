import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsEnum } from 'class-validator';

export class UpdateEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  hoTen?: string;

  @ApiPropertyOptional({ enum: ['Male', 'Female', 'Undefined'] })
  @IsOptional()
  @IsEnum(['Male', 'Female', 'Undefined'])
  gioiTinh?: string;

  @ApiPropertyOptional({ enum: ['DangLam', 'NghiViec'] })
  @IsOptional()
  @IsEnum(['DangLam', 'NghiViec'])
  trangThai?: string;
}
