import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryEmployeesDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['DangLam', 'NghiViec'] })
  @IsOptional()
  @IsEnum(['DangLam', 'NghiViec'])
  trangThai?: string;
}
