import { IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkModerateDto {
  @ApiProperty({ example: [1, 2, 3] })
  @IsArray()
  @IsInt({ each: true })
  reviewIds: number[];

  @ApiProperty({ example: 'approve', enum: ['approve', 'reject'] })
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';

  @ApiPropertyOptional({ example: 'Nội dung vi phạm quy định' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
