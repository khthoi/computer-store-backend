import { IsString, IsInt, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IssueType, TicketChannel, TicketPriority } from '../support.enums';

export class AdminCreateTicketDto {
  @ApiProperty({ example: 3, description: 'ID khách hàng' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  customerId: number;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orderId?: number;

  @ApiProperty({ enum: IssueType, example: IssueType.KhieuNai })
  @IsEnum(IssueType)
  issueType: IssueType;

  @ApiProperty({ enum: TicketPriority, example: TicketPriority.TrungBinh })
  @IsEnum(TicketPriority)
  priority: TicketPriority;

  @ApiProperty({ example: 'Đơn hàng giao chậm' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Mô tả chi tiết vấn đề' })
  @IsString()
  description: string;

  @ApiProperty({ enum: TicketChannel, example: TicketChannel.Form })
  @IsEnum(TicketChannel)
  channel: TicketChannel;

}
