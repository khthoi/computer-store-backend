import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';
import { Customer } from '../users/entities/customer.entity';
import { Employee } from '../employees/entities/employee.entity';

const RT_COOKIE = 'refresh_token';
const RT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 ngày (ms)
  path: '/api/auth',
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản khách hàng' })
  async register(@Body() dto: RegisterCustomerDto, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...data } = await this.authService.register(dto);
    res.cookie(RT_COOKIE, refreshToken, RT_COOKIE_OPTIONS);
    return data;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local-customer'))
  @ApiOperation({ summary: 'Đăng nhập khách hàng' })
  @ApiBody({ type: LoginDto })
  async loginCustomer(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...data } = await this.authService.loginCustomer(req.user as Customer);
    res.cookie(RT_COOKIE, refreshToken, RT_COOKIE_OPTIONS);
    return data;
  }

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local-employee'))
  @ApiOperation({ summary: 'Đăng nhập nhân viên / admin' })
  @ApiBody({ type: LoginDto })
  async loginEmployee(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...data } = await this.authService.loginEmployee(req.user as Employee);
    res.cookie(RT_COOKIE, refreshToken, RT_COOKIE_OPTIONS);
    return data;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cấp lại access token (đọc RT từ cookie)' })
  refresh(@Req() req: Request) {
    const rt = req.cookies?.[RT_COOKIE] as string | undefined;
    if (!rt) throw new UnauthorizedException('Không có refresh token');
    return this.authService.refreshToken(rt);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Đăng xuất (thu hồi token)' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = (req.headers['authorization'] ?? '').replace('Bearer ', '');
    await this.authService.logout(user, rawToken);
    res.clearCookie(RT_COOKIE, { path: '/api/auth' });
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Thông tin người dùng từ JWT (không query DB)' })
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }
}
