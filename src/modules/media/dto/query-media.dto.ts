import { IsOptional, IsString, IsIn } from 'class-validator';
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
}
