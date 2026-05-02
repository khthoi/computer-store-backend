import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ApproveItemDto {
  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  phienBanId: number;

  @ApiPropertyOptional({ example: 18 })
  @IsInt()
  @Min(0)
  soLuongThucNhap: number;

  @ApiPropertyOptional({ example: 2, description: 'Số lượng hư hỏng trong số hàng đã nhận' })
  @IsOptional()
  @IsInt()
  @Min(0)
  soLuongHuHong?: number;

  @ApiProperty({ example: 'Thiếu 2 phụ kiện' })
  @IsString()
  @IsNotEmpty({ message: 'Ghi chú kiểm kê không được để trống' })
  ghiChu: string;
}

export class ApproveImportDto {
  @ApiPropertyOptional({ type: [ApproveItemDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ApproveItemDto)
  items?: ApproveItemDto[];
}
