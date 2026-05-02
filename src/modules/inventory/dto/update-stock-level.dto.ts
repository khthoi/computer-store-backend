import { IsOptional, IsInt, IsString, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStockLevelDto {
  @ApiPropertyOptional({ description: 'Ngưỡng cảnh báo tồn kho thấp', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  nguongCanhBao?: number;

  @ApiPropertyOptional({ description: 'Vị trí lưu trữ trong kho', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  viTriLuuTru?: string;
}
