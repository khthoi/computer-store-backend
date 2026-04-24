import { IsIn, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExportReportDto {
  @ApiProperty({
    enum: ['revenue', 'rfm', 'inventory'],
    description: 'Loại báo cáo cần xuất',
  })
  @IsIn(['revenue', 'rfm', 'inventory'])
  type: string;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Ngày bắt đầu (cho báo cáo doanh thu)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-04-24', description: 'Ngày kết thúc (cho báo cáo doanh thu)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
