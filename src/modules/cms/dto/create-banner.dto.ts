import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  Min,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export const BANNER_POSITIONS = ['homepage_hero', 'homepage_hero_slider', 'homepage_small', 'side_banner', 'promotions_banner'] as const;
export const BANNER_STATUSES = ['draft', 'active'] as const;
export const SIDE_BANNER_PLACEMENTS = ['left', 'right'] as const;

export class CreateBannerDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({ enum: BANNER_POSITIONS })
  @IsEnum(BANNER_POSITIONS)
  position: string;

  @ApiPropertyOptional({ enum: BANNER_STATUSES })
  @IsOptional()
  @IsEnum(BANNER_STATUSES)
  status?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  imageUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  mobileImageUrl?: string;

  @ApiPropertyOptional({ enum: SIDE_BANNER_PLACEMENTS })
  @IsOptional()
  @IsEnum(SIDE_BANNER_PLACEMENTS)
  sidePlacement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  caption?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkUrl?: string;

  @ApiPropertyOptional({ enum: ['_self', '_blank'] })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  linkTarget?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  overlayText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  overlaySubtext?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ctaLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  ctaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  badge?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  badgeColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  badgeTextColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  gridX?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  gridY?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  gridW?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  gridH?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isEnabled?: boolean;
}
