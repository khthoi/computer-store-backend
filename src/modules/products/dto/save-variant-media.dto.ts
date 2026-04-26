import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MediaTypeFrontend {
  Main = 'main',
  Gallery = 'gallery',
}

export class MediaItemDto {
  @ApiProperty() @IsString() url: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assetId?: string | null;
  @ApiProperty({ enum: MediaTypeFrontend }) @IsEnum(MediaTypeFrontend) type: MediaTypeFrontend;
  @ApiProperty() @IsNumber() order: number;
  @ApiPropertyOptional() @IsOptional() @IsString() altText?: string;
}

export class SaveVariantMediaDto {
  @ApiProperty({ type: [MediaItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  media: MediaItemDto[];
}
