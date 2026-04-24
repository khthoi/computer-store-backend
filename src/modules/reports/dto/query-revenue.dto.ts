import { IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryRevenueDto {
  @ApiPropertyOptional({ example: '2026-01-01', description: 'Ngày bắt đầu (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-04-24', description: 'Ngày kết thúc (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
