import { IsArray, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SpecValueItemDto {
  @ApiProperty()
  @IsInt()
  loaiThongSoId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  giaTriThongSo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  giaTriChuan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  giaTriSo?: number;
}

export class SaveSpecValuesDto {
  @ApiProperty({ type: [SpecValueItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecValueItemDto)
  specs: SpecValueItemDto[];
}
