import {
  IsEnum, IsOptional, IsString, IsInt, MaxLength, MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IssueType, TicketChannel, TicketPriority } from '../support.enums';

export class CreateTicketDto {
  @ApiPropertyOptional({ example: 20, description: 'ID đơn hàng liên quan (nếu có)' })
  @IsOptional()
  @IsInt()
  orderId?: number;

  @ApiProperty({ enum: IssueType, example: IssueType.KhieuNai })
  @IsEnum(IssueType)
  issueType: IssueType;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.TrungBinh })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority = TicketPriority.TrungBinh;

  @ApiProperty({ example: 'Đơn hàng #20 giao trễ hơn 5 ngày' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  title: string;

  @ApiProperty({ example: 'Tôi đặt hàng ngày 01/06, dự kiến giao 03/06 nhưng đến nay chưa nhận được...' })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiProperty({ enum: TicketChannel, example: TicketChannel.Form })
  @IsEnum(TicketChannel)
  channel: TicketChannel;

}
