import { Transform } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsDefined, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BANNER_POSITIONS } from './create-banner.dto';

export class PublicBannerQueryDto {
  @ApiProperty({
    isArray: true,
    enum: BANNER_POSITIONS,
    example: ['homepage_hero', 'homepage_small'],
    description: 'One or more public banner positions',
  })
  @IsDefined()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(BANNER_POSITIONS, { each: true })
  position: string[];
}
