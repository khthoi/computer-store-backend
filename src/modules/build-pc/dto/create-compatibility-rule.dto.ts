import { IsString, IsInt, IsOptional, IsBoolean, IsIn, Min, MaxLength, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCompatibilityRuleDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  tenQuyTac: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  slotNguonId: number;

  @ApiProperty({ maxLength: 50, description: 'Tech key (maps to maKtNguon + maKtDich)' })
  @IsString()
  @MaxLength(50)
  maKyThuat: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  slotDichId?: number;

  @ApiProperty({ enum: ['exact_match', 'contains', 'min_sum', 'min_value'] })
  @IsIn(['exact_match', 'contains', 'min_sum', 'min_value'])
  loaiKiemTra: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  heSo?: number;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  giaTriMacDinh?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  moTa?: string;

  @ApiProperty()
  @IsBoolean()
  batBuoc: boolean;

  @ApiProperty()
  @IsBoolean()
  isActive: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  thuTu?: number;
}
