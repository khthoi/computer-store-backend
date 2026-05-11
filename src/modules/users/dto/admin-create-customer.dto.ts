import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, ValidateIf, Matches } from 'class-validator';

export class AdminCreateCustomerDto {
  @ApiProperty({ example: 'nguyenvana@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @MaxLength(255)
  fullName: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @ValidateIf((o: AdminCreateCustomerDto) => o.phone !== null)
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'banned'], default: 'active' })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'banned'])
  status?: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'], nullable: true })
  @IsOptional()
  @ValidateIf((o: AdminCreateCustomerDto) => o.gender !== null)
  @IsEnum(['male', 'female', 'other'])
  gender?: string | null;

  @ApiPropertyOptional({ example: '1990-01-15', nullable: true, description: 'ISO date YYYY-MM-DD or null' })
  @IsOptional()
  @ValidateIf((o: AdminCreateCustomerDto) => o.dateOfBirth !== null)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth must be YYYY-MM-DD' })
  dateOfBirth?: string | null;
}
