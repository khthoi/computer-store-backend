import { IsInt, IsString, IsNotEmpty, IsOptional, IsIn, IsArray, ValidateNested, ArrayMinSize, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExportReceiptItemDto {
  @ApiProperty()
  @IsInt()
  phienBanId: number;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  soLuong: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ghiChu?: string;
}

export class CreateExportReceiptDto {
  @ApiProperty({ enum: ['XuatHuy', 'XuatDieuChinh', 'XuatNoiBo'] })
  @IsIn(['XuatHuy', 'XuatDieuChinh', 'XuatNoiBo'])
  loaiPhieu: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  lyDo: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ghiChu?: string;

  @ApiProperty({ type: [ExportReceiptItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => ExportReceiptItemDto)
  items: ExportReceiptItemDto[];
}
