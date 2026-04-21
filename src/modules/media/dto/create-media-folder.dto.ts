import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsInt, IsBoolean, Min, MaxLength } from 'class-validator';

export class CreateMediaFolderDto {
  @ApiProperty({ example: 'Product Images', description: 'Tên hiển thị của thư mục' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  tenHienThi: string;

  @ApiProperty({ example: 'pc-store/products', description: 'Đường dẫn thư mục trên Cloudinary' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  duongDan: string;

  @ApiPropertyOptional({ example: 'Ảnh sản phẩm chính và phụ' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  moTa?: string;

  @ApiPropertyOptional({ enum: ['all', 'image', 'video', 'raw'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'image', 'video', 'raw'])
  loaiChoPhep?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  thuTu?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
