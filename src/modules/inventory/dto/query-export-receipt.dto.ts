import { IsInt, IsString, IsOptional, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryExportReceiptDto {
  @IsInt() @IsOptional() @Min(1) @Type(() => Number)
  page?: number;

  @IsInt() @IsOptional() @Min(1) @Type(() => Number)
  limit?: number;

  @IsIn(['XuatHuy', 'XuatDieuChinh', 'XuatNoiBo', 'XuatBan']) @IsOptional()
  loaiPhieu?: string;

  @IsString() @IsOptional()
  search?: string;

  @IsString() @IsOptional()
  startDate?: string;

  @IsString() @IsOptional()
  endDate?: string;

  @IsString() @IsOptional()
  sortBy?: string;

  @IsIn(['asc', 'desc']) @IsOptional()
  sortOrder?: string;
}
