import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminCreateAddressDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @MaxLength(255)
  recipientName: string;

  @ApiProperty({ example: '0901234567' })
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: '123 Lê Lợi' })
  @IsString()
  @MaxLength(500)
  addressLine: string;

  @ApiPropertyOptional({ example: 'Phường Bến Nghé' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  ward?: string;

  @ApiProperty({ example: 'Quận 1' })
  @IsString()
  @MaxLength(200)
  district: string;

  @ApiProperty({ example: 'TP. Hồ Chí Minh' })
  @IsString()
  @MaxLength(200)
  province: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class AdminUpdateAddressDto extends PartialType(AdminCreateAddressDto) {}
