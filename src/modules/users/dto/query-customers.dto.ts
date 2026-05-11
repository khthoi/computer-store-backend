import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryCustomersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['active', 'banned', 'inactive'] })
  @IsOptional()
  @IsEnum(['active', 'banned', 'inactive'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
