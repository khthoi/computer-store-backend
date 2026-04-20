import { IsInt, IsOptional, IsBoolean, IsIn, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class LinkCategoryGroupDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  danhMucId: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nhomThongSoId: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  thuTuHienThi?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hienThiBoLoc?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  thuTuBoLoc?: number;

  @ApiPropertyOptional({ enum: ['hien_thi', 'loai_tru', 'ghi_de_thu_tu'], default: 'hien_thi' })
  @IsOptional()
  @IsIn(['hien_thi', 'loai_tru', 'ghi_de_thu_tu'])
  hanhDong?: string;
}
