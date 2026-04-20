import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryCustomersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['HoatDong', 'BiKhoa', 'ChoXacMinh'] })
  @IsOptional()
  @IsEnum(['HoatDong', 'BiKhoa', 'ChoXacMinh'])
  trangThai?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;
}
