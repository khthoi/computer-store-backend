import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, ValidateIf, Matches } from 'class-validator';

export class AdminUpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn A' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'], nullable: true })
  @IsOptional()
  @ValidateIf((o: AdminUpdateCustomerDto) => o.gender !== null)
  @IsEnum(['male', 'female', 'other'])
  gender?: string | null;

  @ApiPropertyOptional({ example: '1990-01-15', nullable: true, description: 'ISO date YYYY-MM-DD or null to clear' })
  @IsOptional()
  @ValidateIf((o: AdminUpdateCustomerDto) => o.dateOfBirth !== null)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth must be YYYY-MM-DD' })
  dateOfBirth?: string | null;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'banned'] })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'banned'])
  status?: string;
}
