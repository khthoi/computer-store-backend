import {
  IsString, IsArray, IsOptional, IsInt, IsBoolean,
  MinLength, Min, ArrayNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConfigDto {
  @ApiProperty({ example: 'don_hang.xac_nhan' })
  @IsString()
  @MinLength(2)
  triggerKey: string;

  @ApiProperty({ example: 'Xác nhận đơn hàng' })
  @IsString()
  displayName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: ['Push', 'Email'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  channels: string[];

  @ApiProperty({ example: 'Đơn hàng {{orderCode}} đã được xác nhận' })
  @IsString()
  templateTitle: string;

  @ApiProperty({ example: 'Đơn hàng của bạn đã được xác nhận và đang chuẩn bị.' })
  @IsString()
  templateContent: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  delaySeconds?: number = 0;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
