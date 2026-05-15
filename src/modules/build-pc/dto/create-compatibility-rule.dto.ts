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

  @ApiProperty({ maxLength: 50, description: 'Mã kỹ thuật của thông số ở slot nguồn (vd. socket)' })
  @IsString()
  @MaxLength(50)
  maKtNguon: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  slotDichId?: number;

  @ApiPropertyOptional({ maxLength: 50, description: 'Mã kỹ thuật của thông số ở slot đích (vd. mb_socket). Bắt buộc khi slotDichId có giá trị.' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  maKtDich?: string;

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
