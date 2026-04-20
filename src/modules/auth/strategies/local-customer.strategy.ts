import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { Customer } from '../../users/entities/customer.entity';

@Injectable()
export class LocalCustomerStrategy extends PassportStrategy(Strategy, 'local-customer') {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email', passwordField: 'matKhau' });
  }

  async validate(email: string, matKhau: string): Promise<Customer> {
    const customer = await this.authService.validateCustomer(email, matKhau);
    if (!customer) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    if (customer.trangThai === 'BiKhoa') throw new UnauthorizedException('Tài khoản đã bị khoá');
    return customer;
  }
}
