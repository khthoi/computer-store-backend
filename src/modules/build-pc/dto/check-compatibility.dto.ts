import { IsArray, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CheckCompatibilityDto {
  @ApiProperty({ description: 'Danh sách phien_ban_id cần kiểm tra tương thích' })
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  phienBanIds: number[];
}
