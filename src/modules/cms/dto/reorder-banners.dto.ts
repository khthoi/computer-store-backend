import { IsArray, IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const BANNER_POSITIONS = [
  'homepage_hero',
  'homepage_hero_slider',
  'homepage_small',
  'side_banner',
  'promotions_banner',
] as const;

export class ReorderBannersDto {
  @ApiProperty({ example: 'homepage_hero_slider', enum: BANNER_POSITIONS })
  @IsIn(BANNER_POSITIONS)
  position: string;

  @ApiProperty({ example: ['3', '1', '2'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
