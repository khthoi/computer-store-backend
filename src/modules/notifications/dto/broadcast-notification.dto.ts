import {
  IsIn, IsOptional, IsArray, IsInt, IsString, IsBoolean,
  ArrayNotEmpty, MinLength, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GroupFilterDto {
  @ApiPropertyOptional({ example: 'HoatDong' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'Gold', description: 'Bronze | Silver | Gold | Platinum' })
  @IsOptional()
  @IsString()
  tier?: string;
}

export class BroadcastNotificationDto {
  @ApiProperty({ enum: ['all', 'group', 'specific'] })
  @IsIn(['all', 'group', 'specific'])
  targetType: 'all' | 'group' | 'specific';

  @ApiPropertyOptional({ type: [Number], example: [101, 102] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  khachHangIds?: number[];

  @ApiPropertyOptional({ type: GroupFilterDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GroupFilterDto)
  groupFilter?: GroupFilterDto;

  @ApiProperty({ example: 'HeThong' })
  @IsIn(['DonHang', 'GiaoDich', 'HoanHang', 'KhuyenMai', 'Loyalty', 'NhacNho', 'HeThong'])
  loaiThongBao: string;

  @ApiProperty({ type: [String], example: ['Email', 'Push'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(['Email', 'SMS', 'Push'], { each: true })
  kenhGui: string[];

  @ApiProperty({ example: 'Bảo trì hệ thống' })
  @IsString()
  @MinLength(1)
  tieuDe: string;

  @ApiProperty({ example: 'Hệ thống sẽ bảo trì từ 02:00 đến 04:00.' })
  @IsString()
  @MinLength(1)
  noiDung: string;

  @ApiPropertyOptional({ example: 'DonHang' })
  @IsOptional()
  @IsString()
  entityLienQuan?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  entityLienQuanId?: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  guiNgay: boolean;

  @ApiPropertyOptional({ example: '2024-04-18T02:00:00.000Z' })
  @IsOptional()
  @IsString()
  thoiGianGui?: string;
}
