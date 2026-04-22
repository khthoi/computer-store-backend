import { IsString, IsOptional, IsBoolean, IsInt, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateFaqItemDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  groupId: number;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  question: string;

  @ApiProperty()
  @IsString()
  answer: string;

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
}
