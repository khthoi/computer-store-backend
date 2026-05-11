import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminResetPasswordDto {
  @ApiProperty({ example: 'NewPass@123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @Matches(/[A-Z]/, { message: 'Mật khẩu phải chứa ít nhất 1 chữ hoa' })
  @Matches(/[0-9]/, { message: 'Mật khẩu phải chứa ít nhất 1 chữ số' })
  newPassword: string;

  @ApiProperty({ example: 'NewPass@123' })
  @IsString()
  confirmPassword: string;
}
