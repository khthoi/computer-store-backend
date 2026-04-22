import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReplyReviewDto {
  @ApiProperty({ example: 'Cảm ơn bạn đã tin tưởng và đánh giá sản phẩm!' })
  @IsString()
  @MinLength(5)
  content: string;

  @ApiPropertyOptional({ enum: ['Reply', 'InternalNote'], default: 'Reply' })
  @IsOptional()
  @IsEnum(['Reply', 'InternalNote'])
  messageType?: 'Reply' | 'InternalNote' = 'Reply';
}
