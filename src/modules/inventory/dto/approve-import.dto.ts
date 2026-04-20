import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ApproveItemDto {
  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  phienBanId: number;

  @ApiPropertyOptional({ example: 18 })
  @IsInt()
  @Min(0)
  soLuongThucNhap: number;
}

export class ApproveImportDto {
  @ApiPropertyOptional({ type: [ApproveItemDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ApproveItemDto)
  items?: ApproveItemDto[];
}
