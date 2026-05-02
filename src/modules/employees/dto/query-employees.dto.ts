import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryEmployeesDto extends PaginationDto {
  // Override: remove the 100-item cap so callers can fetch all employees at once
  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  override limit?: number = 20;

  @ApiPropertyOptional({ enum: ['DangLam', 'NghiViec'] })
  @IsOptional()
  @IsEnum(['DangLam', 'NghiViec'])
  trangThai?: string;
}
