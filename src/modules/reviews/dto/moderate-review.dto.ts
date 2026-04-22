import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ModerateReviewDto {
  @ApiPropertyOptional({ example: 'Nội dung vi phạm chính sách cộng đồng' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
