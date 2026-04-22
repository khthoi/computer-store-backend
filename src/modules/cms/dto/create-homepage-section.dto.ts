import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const SECTION_TYPES = ['category', 'promotion', 'brand', 'manual', 'new_arrivals', 'best_selling'] as const;
const SORT_BYS = ['price_asc', 'price_desc', 'newest', 'best_selling', 'rating'] as const;
const LAYOUTS = ['carousel', 'grid_2x3', 'grid_3x2', 'grid_4'] as const;

export class SectionItemDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  variantId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateHomepageSectionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subtitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  viewAllUrl?: string;

  @ApiProperty({ enum: SECTION_TYPES })
  @IsEnum(SECTION_TYPES)
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  sourceConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: SORT_BYS })
  @IsOptional()
  @IsEnum(SORT_BYS)
  sortBy?: string;

  @ApiPropertyOptional({ default: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxProducts?: number;

  @ApiPropertyOptional({ enum: LAYOUTS })
  @IsOptional()
  @IsEnum(LAYOUTS)
  layout?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  badgeLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  badgeColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({ type: [SectionItemDto], description: 'Items for manual type sections' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionItemDto)
  items?: SectionItemDto[];
}
