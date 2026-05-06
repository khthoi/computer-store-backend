import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryReturnsDto {
  @ApiPropertyOptional({ enum: ['ChoDuyet', 'DaDuyet', 'TuChoi', 'DaNhanHang', 'DaKiemTra', 'DangXuLy', 'HoanThanh'] })
  @IsOptional()
  @IsString()
  @IsIn(['ChoDuyet', 'DaDuyet', 'TuChoi', 'DaNhanHang', 'DaKiemTra', 'DangXuLy', 'HoanThanh'])
  status?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
