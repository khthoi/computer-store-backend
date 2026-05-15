import { ApiProperty } from '@nestjs/swagger';

export class AuthUserResponseDto {
  @ApiProperty({ example: '5', description: 'Customer ID dạng string (FE chuẩn hoá)' })
  id: string;

  @ApiProperty({ example: 'nguyenvana@gmail.com' })
  email: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  name: string;

  @ApiProperty({ example: '0901234567', nullable: true })
  phone: string | null;

  @ApiProperty({ example: 'https://res.cloudinary.com/...', nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ example: 'customer', enum: ['customer'] })
  role: 'customer';
}

export class AuthCustomerLoginResponseDto {
  @ApiProperty({ type: AuthUserResponseDto })
  user: AuthUserResponseDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 18000, description: 'Số giây access token còn hiệu lực' })
  expiresIn: number;
}
