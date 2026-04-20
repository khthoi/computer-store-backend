import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  IsIn,
  IsBoolean,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BuildDetailDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  slotId: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  phienBanId: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  soLuong?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  thuTu?: number;
}

export class CreateSavedBuildDto {
  @ApiPropertyOptional({ default: 'Cấu hình của tôi' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tenBuild?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  moTa?: string;

  @ApiPropertyOptional({ enum: ['draft', 'complete', 'shared'], default: 'draft' })
  @IsOptional()
  @IsIn(['draft', 'complete', 'shared'])
  trangThai?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ type: [BuildDetailDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BuildDetailDto)
  details?: BuildDetailDto[];
}
