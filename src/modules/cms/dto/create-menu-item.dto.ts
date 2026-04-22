import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const MENU_ITEM_TYPES = ['link', 'page', 'category'] as const;

export class CreateMenuItemDto {
  @ApiPropertyOptional({ description: 'parentId = null means top-level item' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  parentId?: number;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  label: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  url: string;

  @ApiPropertyOptional({ enum: MENU_ITEM_TYPES })
  @IsOptional()
  @IsEnum(MENU_ITEM_TYPES)
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  openInNewTab?: boolean;
}
