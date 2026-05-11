import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBuildSlotDto {
  @ApiProperty({ example: 'CPU' })
  @IsString()
  @IsNotEmpty()
  tenKhe: string;

  @ApiProperty({ example: 'cpu' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_]+$/)
  maKhe: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  danhMucId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(8)
  soLuong: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  batBuoc: boolean;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  thuTu: number;

  @ApiPropertyOptional({ example: 'Bộ vi xử lý trung tâm' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  moTa?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}
