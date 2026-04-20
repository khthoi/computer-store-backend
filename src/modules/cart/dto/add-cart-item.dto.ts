import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ example: 5 })
  @IsInt()
  phienBanId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  soLuong: number;
}
