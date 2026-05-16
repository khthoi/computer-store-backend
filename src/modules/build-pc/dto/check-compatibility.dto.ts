import { IsArray, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CheckCompatibilityDto {
  @ApiProperty({ description: 'Danh sách phien_ban_id cần kiểm tra tương thích' })
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  phienBanIds: number[];

  /**
   * Số lượng tương ứng với mỗi phần tử trong `phienBanIds` (cùng index, cùng độ dài).
   * Khi vắng mặt, mỗi phiên bản coi như số lượng = 1.
   * Dùng cho các quy tắc tính tổng (vd. `min_sum`: dung lượng RAM tối đa của mainboard
   * phải >= tổng dung lượng các thanh RAM × số lượng).
   */
  @ApiPropertyOptional({ description: 'Số lượng tương ứng theo từng phien_ban_id' })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  soLuongs?: number[];
}
