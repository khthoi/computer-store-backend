import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import type { GoogleProfilePayload } from './strategies/google.strategy';

const RT_COOKIE = 'refresh_token';
const RT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

@ApiTags('Auth')
@Controller('auth/google')
export class GoogleOAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Redirect tới Google's consent screen.
   * Passport strategy ('google') tự xử lý redirect.
   */
  @Public()
  @Get('start')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Khởi tạo flow OAuth Google (redirect)' })
  start(): void {
    // Passport tự redirect — body không bao giờ chạy
  }

  /**
   * Callback từ Google. Sau khi xác thực, redirect popup về
   * `${CLIENT_FRONTEND_URL}/oauth/callback?token=...&expiresIn=...&user=<b64>`.
   */
  @Public()
  @Get('callback')
  @UseGuards(AuthGuard('google'))
  @ApiExcludeEndpoint()
  async callback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const clientUrl = this.configService.get<string>('CLIENT_FRONTEND_URL', 'http://localhost:3000');
    try {
      const profile = req.user as GoogleProfilePayload | undefined;
      if (!profile) {
        return res.redirect(`${clientUrl}/oauth/callback?error=oauth_failed`);
      }

      const customer = await this.authService.findOrCreateCustomerFromGoogle(profile);
      const { user, accessToken, expiresIn, refreshToken } = await this.authService.loginWithGoogle(customer);

      res.cookie(RT_COOKIE, refreshToken, RT_COOKIE_OPTIONS);

      const userB64 = Buffer.from(JSON.stringify(user), 'utf8').toString('base64url');
      const params = new URLSearchParams({
        token: accessToken,
        expiresIn: String(expiresIn),
        user: userB64,
      });
      return res.redirect(`${clientUrl}/oauth/callback?${params.toString()}`);
    } catch {
      return res.redirect(`${clientUrl}/oauth/callback?error=oauth_failed`);
    }
  }
}
