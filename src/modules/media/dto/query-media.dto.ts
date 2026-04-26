import { IsOptional, IsString, IsIn, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryMediaDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['image', 'video', 'raw'] })
  @IsOptional()
  @IsString()
  @IsIn(['image', 'video', 'raw'])
  loaiFile?: string;

  @ApiPropertyOptional({ enum: ['active', 'archived'] })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'archived'])
  trangThai?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID thư mục' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  thuMucId?: number;
}
