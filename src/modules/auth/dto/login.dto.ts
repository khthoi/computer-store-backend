import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Passw0rd!' })
  @IsString()
  @MinLength(1)
  password: string;

  @ApiPropertyOptional({ example: false, description: 'Duy trì đăng nhập (refresh token 30 ngày). Mặc định false = session cookie (1 ngày).' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
