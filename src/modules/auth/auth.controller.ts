import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiOkResponse, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RolesService } from '../roles/roles.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthLoginEmployeeResponseDto } from './dto/auth-login-response.dto';
import { AuthCustomerLoginResponseDto } from './dto/auth-user-response.dto';
import { AuthTokenResponseDto } from './dto/auth-token-response.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';
import { Customer } from '../users/entities/customer.entity';
import { Employee } from '../employees/entities/employee.entity';

const RT_COOKIE = 'refresh_token';
const RT_COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
};
const RT_COOKIE_OPTIONS = { ...RT_COOKIE_BASE, maxAge: 30 * 24 * 60 * 60 * 1000 };
const RT_COOKIE_SESSION = RT_COOKIE_BASE; // không có maxAge → session cookie, hết khi đóng browser

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly rolesService: RolesService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản khách hàng' })
  @ApiOkResponse({ type: AuthCustomerLoginResponseDto, description: 'Đăng ký thành công, refresh token được set trong cookie' })
  @ApiResponse({ status: 409, description: 'Email đã được đăng ký' })
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
  @ApiOkResponse({ type: AuthCustomerLoginResponseDto, description: 'Đăng nhập thành công, refresh token được set trong cookie' })
  @ApiResponse({ status: 401, description: 'Email hoặc mật khẩu không đúng' })
  async loginCustomer(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rememberMe = Boolean((req.body as { rememberMe?: boolean })?.rememberMe);
    const { refreshToken, ...data } = await this.authService.loginCustomer(req.user as Customer, rememberMe);
    res.cookie(RT_COOKIE, refreshToken, rememberMe ? RT_COOKIE_OPTIONS : RT_COOKIE_SESSION);
    return data;
  }

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local-employee'))
  @ApiOperation({ summary: 'Đăng nhập nhân viên / admin' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: AuthLoginEmployeeResponseDto, description: 'Đăng nhập thành công, refresh token được set trong cookie' })
  @ApiResponse({ status: 401, description: 'Email hoặc mật khẩu không đúng' })
  async loginEmployee(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip;
    const userAgent = req.headers['user-agent'] as string | undefined;
    const rememberMe = Boolean((req.body as { rememberMe?: boolean })?.rememberMe);
    const { refreshToken, ...data } = await this.authService.loginEmployee(req.user as Employee, ip, userAgent, rememberMe);
    res.cookie(RT_COOKIE, refreshToken, rememberMe ? RT_COOKIE_OPTIONS : RT_COOKIE_SESSION);
    return data;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cấp lại access token (đọc RT từ cookie)' })
  @ApiOkResponse({ type: AuthTokenResponseDto, description: 'Access token mới' })
  @ApiResponse({ status: 401, description: 'Refresh token không hợp lệ hoặc đã hết hạn' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rt = req.cookies?.[RT_COOKIE] as string | undefined;
    if (!rt) throw new UnauthorizedException('Không có refresh token');
    const result = await this.authService.refreshToken(rt);
    // Customer: rotate refresh token → set cookie mới; Employee: cookie cũ vẫn dùng được
    if ('refreshToken' in result) {
      res.cookie(RT_COOKIE, result.refreshToken, RT_COOKIE_OPTIONS);
      return { accessToken: result.accessToken };
    }
    return result;
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

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Yêu cầu gửi email đặt lại mật khẩu' })
  @ApiOkResponse({ schema: { example: { message: 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn trong vài phút.' } } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn trong vài phút.' };
  }

  @Public()
  @Get('reset-password')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Kiểm tra tính hợp lệ của reset token' })
  @ApiQuery({ name: 'token', required: true })
  @ApiOkResponse({ schema: { example: { valid: true } } })
  @ApiResponse({ status: 200, description: 'valid: false nếu token không hợp lệ/hết hạn' })
  async validateResetToken(@Query('token') token: string) {
    const valid = await this.authService.validateResetToken(token ?? '');
    return { valid };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Đặt lại mật khẩu bằng token' })
  @ApiOkResponse({ schema: { example: { message: 'Mật khẩu đã được đặt lại thành công.' } } })
  @ApiResponse({ status: 400, description: 'Token không hợp lệ hoặc đã hết hạn' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Mật khẩu đã được đặt lại thành công.' };
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Thông tin người dùng từ JWT — kèm permissions đã resolve (employee)',
  })
  @ApiOkResponse({
    schema: {
      example: {
        sub: 5,
        email: 'admin@store.vn',
        type: 'employee',
        roles: ['admin'],
        permissions: ['orders.read', 'orders.update', 'products.read'],
        jti: 'a1b2c3...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async me(@CurrentUser() user: JwtPayload) {
    if (user.type === 'employee') {
      const permissions = await this.rolesService.getPermissionsForRoles(user.roles ?? []);
      return { ...user, permissions };
    }
    return { ...user, permissions: [] };
  }
}
