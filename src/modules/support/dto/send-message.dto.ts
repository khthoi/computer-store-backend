import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'Chúng tôi đã xác nhận và sẽ hỗ trợ bạn trong 24h tới.' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ enum: ['Reply', 'InternalNote'], default: 'Reply' })
  @IsOptional()
  @IsEnum(['Reply', 'InternalNote'])
  messageType?: 'Reply' | 'InternalNote' = 'Reply';
}
