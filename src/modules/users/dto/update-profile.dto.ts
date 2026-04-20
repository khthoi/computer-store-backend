import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsDateString, IsEnum } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn A' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  hoTen?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  soDienThoai?: string;

  @ApiPropertyOptional({ example: '1995-01-15' })
  @IsOptional()
  @IsDateString()
  ngaySinh?: string;

  @ApiPropertyOptional({ enum: ['Nam', 'Nu', 'Khac'] })
  @IsOptional()
  @IsEnum(['Nam', 'Nu', 'Khac'])
  gioiTinh?: string;
}
