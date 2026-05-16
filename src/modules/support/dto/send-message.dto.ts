import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  // Content may be empty when the message is attachment-only; the service enforces
  // that either content or at least one file is provided.
  @ApiPropertyOptional({ example: 'Chúng tôi đã xác nhận và sẽ hỗ trợ bạn trong 24h tới.' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ enum: ['Reply', 'InternalNote'], default: 'Reply' })
  @IsOptional()
  @IsEnum(['Reply', 'InternalNote'])
  messageType?: 'Reply' | 'InternalNote' = 'Reply';
}
