import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpdateMeDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullName: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'], nullable: true })
  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  @Transform(({ value }) => value ?? null)
  gender?: 'male' | 'female' | 'other' | null;

  @ApiPropertyOptional({ example: '1990-01-15', nullable: true })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value ?? null)
  dateOfBirth?: string | null;
}
