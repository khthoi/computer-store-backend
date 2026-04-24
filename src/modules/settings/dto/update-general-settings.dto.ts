import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGeneralSettingsDto {
  @ApiPropertyOptional({ example: 'Computer Store' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  site_name?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/.../logo.png' })
  @IsOptional()
  @IsString()
  logo_url?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/.../favicon.ico' })
  @IsOptional()
  @IsString()
  favicon_url?: string;

  @ApiPropertyOptional({ example: 'admin@computerstore.vn' })
  @IsOptional()
  @IsString()
  contact_email?: string;

  @ApiPropertyOptional({ example: '1800 1234' })
  @IsOptional()
  @IsString()
  contact_phone?: string;

  @ApiPropertyOptional({ example: '123 Nguyễn Văn Linh, Quận 7, TP.HCM' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'https://facebook.com/computerstore' })
  @IsOptional()
  @IsString()
  social_facebook?: string;

  @ApiPropertyOptional({ example: 'https://zalo.me/computerstore' })
  @IsOptional()
  @IsString()
  social_zalo?: string;

  @ApiPropertyOptional({ example: 'Computer Store — Máy tính & Linh kiện chính hãng' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  meta_description?: string;
}
