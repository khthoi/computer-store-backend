import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryTicketsDto {
  @ApiPropertyOptional({ enum: ['Moi', 'DangXuLy', 'ChoDongY', 'DaDong', 'MoLai'] })
  @IsOptional()
  @IsString()
  @IsIn(['Moi', 'DangXuLy', 'ChoDongY', 'DaDong', 'MoLai'])
  status?: string;

  @ApiPropertyOptional({ enum: ['Cao', 'TrungBinh', 'Thap'] })
  @IsOptional()
  @IsString()
  @IsIn(['Cao', 'TrungBinh', 'Thap'])
  priority?: string;

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
