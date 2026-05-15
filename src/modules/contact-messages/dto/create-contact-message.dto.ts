import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateContactMessageDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập họ và tên' })
  @Length(2, 150)
  fullName: string;

  @ApiProperty({ example: 'email@example.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: '0901234567', required: false })
  @IsOptional()
  @Matches(/^(0|\+84)[0-9]{8,10}$/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string;

  @ApiProperty({ example: 'tu-van-san-pham' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn chủ đề' })
  @Length(1, 100)
  subject: string;

  @ApiProperty({ example: 'Tôi cần tư vấn cấu hình PC gaming...' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập nội dung' })
  @Length(20, 5000, { message: 'Nội dung phải từ 20 đến 5000 ký tự' })
  message: string;
}
