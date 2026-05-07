import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BarStatus, BarPosition } from '../entities/announcement-bar.entity';

export class CreateAnnouncementBarDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ enum: BarStatus })
  @IsOptional()
  @IsEnum(BarStatus)
  status?: BarStatus;

  @ApiPropertyOptional({ enum: BarPosition })
  @IsOptional()
  @IsEnum(BarPosition)
  position?: BarPosition;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  backgroundColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  textColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showCloseButton?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isScrolling?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  linkLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

}
