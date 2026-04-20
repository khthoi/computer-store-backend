import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';
import { Customer } from '../users/entities/customer.entity';
import { Employee } from '../employees/entities/employee.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản khách hàng' })
  register(@Body() dto: RegisterCustomerDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local-customer'))
  @ApiOperation({ summary: 'Đăng nhập khách hàng' })
  @ApiBody({ type: LoginDto })
  loginCustomer(@Req() req: Request) {
    return this.authService.loginCustomer(req.user as Customer);
  }

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local-employee'))
  @ApiOperation({ summary: 'Đăng nhập nhân viên / admin' })
  @ApiBody({ type: LoginDto })
  loginEmployee(@Req() req: Request) {
    return this.authService.loginEmployee(req.user as Employee);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cấp lại access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Đăng xuất (thu hồi token)' })
  logout(@CurrentUser() user: JwtPayload, @Req() req: Request) {
    const rawToken = (req.headers['authorization'] ?? '').replace('Bearer ', '');
    return this.authService.logout(user, rawToken);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Thông tin người dùng từ JWT (không query DB)' })
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }
}
