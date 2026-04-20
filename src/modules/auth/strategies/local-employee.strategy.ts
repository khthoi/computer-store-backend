import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { Employee } from '../../employees/entities/employee.entity';

@Injectable()
export class LocalEmployeeStrategy extends PassportStrategy(Strategy, 'local-employee') {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email', passwordField: 'matKhau' });
  }

  async validate(email: string, matKhau: string): Promise<Employee> {
    const employee = await this.authService.validateEmployee(email, matKhau);
    if (!employee) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    if (employee.trangThai === 'NghiViec') throw new UnauthorizedException('Tài khoản nhân viên đã bị vô hiệu hoá');
    return employee;
  }
}
