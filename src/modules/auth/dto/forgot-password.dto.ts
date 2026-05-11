import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'customer@gmail.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;
}
