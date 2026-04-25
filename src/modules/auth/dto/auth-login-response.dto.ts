import { ApiProperty } from '@nestjs/swagger';
import { AuthCustomerDto } from './auth-customer.dto';
import { AuthEmployeeDto } from './auth-employee.dto';

export class AuthLoginCustomerResponseDto {
  @ApiProperty({ type: AuthCustomerDto })
  customer: AuthCustomerDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;
}

export class AuthLoginEmployeeResponseDto {
  @ApiProperty({ type: AuthEmployeeDto })
  user: AuthEmployeeDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;
}
