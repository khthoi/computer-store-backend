import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class RejectRefundDto {
  @ApiProperty({ example: 'Gateway từ chối: tài khoản không hợp lệ', description: 'Lý do từ chối hoàn tiền' })
  @IsString()
  @MaxLength(500)
  reason: string;
}
