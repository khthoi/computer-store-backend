import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMediaDto {
  @ApiPropertyOptional({ description: 'Tên file gốc hiển thị' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  originalName?: string;

  @ApiPropertyOptional({ description: 'Alt text cho hình ảnh' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  altText?: string;

  @ApiPropertyOptional({ description: 'Caption/mô tả file' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  caption?: string;
}
