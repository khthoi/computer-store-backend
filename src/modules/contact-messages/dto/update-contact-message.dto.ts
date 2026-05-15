import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ContactMessageStatus } from '../entities/contact-message.entity';

export class UpdateContactMessageDto {
  @ApiPropertyOptional({ enum: ContactMessageStatus })
  @IsOptional()
  @IsEnum(ContactMessageStatus)
  status?: ContactMessageStatus;

  @ApiPropertyOptional({ description: 'Ghi chú nội bộ của admin' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}
