import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  IsIn,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSpecTypeDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nhomThongSoId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  tenLoai: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  maKyThuat?: string;

  @ApiPropertyOptional({ enum: ['text', 'number', 'boolean', 'enum'], default: 'text' })
  @IsOptional()
  @IsIn(['text', 'number', 'boolean', 'enum'])
  kieuDuLieu?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  donVi?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  coTheLoc?: boolean;

  @ApiPropertyOptional({ enum: ['checkbox', 'range', 'toggle', 'select', 'combo-select'] })
  @IsOptional()
  @IsIn(['checkbox', 'range', 'toggle', 'select', 'combo-select'])
  widgetLoc?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  thuTuLoc?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  thuTuHienThi?: number;

  @ApiPropertyOptional({ enum: ['BAT_BUOC', 'TUY_CHON'], default: 'BAT_BUOC' })
  @IsOptional()
  @IsIn(['BAT_BUOC', 'TUY_CHON'])
  batBuoc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  moTa?: string;
}
