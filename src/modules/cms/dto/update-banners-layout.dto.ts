import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BannerGridItemDto {
  @ApiProperty({ example: '1' })
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  gridX: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  gridY: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  gridW: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  gridH: number;
}

export class UpdateBannersLayoutDto {
  @ApiProperty({ type: [BannerGridItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BannerGridItemDto)
  items: BannerGridItemDto[];
}
