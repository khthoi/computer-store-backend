import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { Employee } from '../../employees/entities/employee.entity';

@Injectable()
export class LocalEmployeeStrategy extends PassportStrategy(Strategy, 'local-employee') {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email', passwordField: 'password', passReqToCallback: true });
  }

  async validate(req: Request, email: string, matKhau: string): Promise<Employee> {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip;
    const employee = await this.authService.validateEmployee(email, matKhau);
    if (!employee) {
      void this.authService.recordLoginFailed(email, ip, 'Sai mật khẩu');
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    if (employee.trangThai === 'NghiViec') {
      void this.authService.recordLoginFailed(email, ip, 'Tài khoản đã bị vô hiệu hoá');
      throw new UnauthorizedException('Tài khoản nhân viên đã bị vô hiệu hoá');
    }
    return employee;
  }
}
