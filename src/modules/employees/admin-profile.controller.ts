import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Req,
  Query,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ProfileService } from './profile.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  ProfileDataDto,
  NhanVienProfileDto,
  AuditLogEntryDto,
  PaginatedAuditLogDto,
  AvatarResponseDto,
} from './dto/profile-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Admin — My Profile')
@ApiBearerAuth('access-token')
@Controller('admin/me')
export class AdminProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy hồ sơ cá nhân của nhân viên đang đăng nhập' })
  @ApiOkResponse({ type: ProfileDataDto })
  getMe(@CurrentUser() user: JwtPayload): Promise<ProfileDataDto> {
    return this.profileService.getMe(user.sub);
  }

  @Patch()
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân' })
  @ApiOkResponse({ type: NhanVienProfileDto })
  updateMe(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateMeDto,
    @Req() req: Request,
  ): Promise<NhanVienProfileDto> {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip;
    return this.profileService.updateMe(user.sub, dto, ip);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Yêu cầu đổi mật khẩu — gửi link xác nhận qua email' })
  @ApiOkResponse({ schema: { example: { message: 'Email xác nhận đã được gửi...' } } })
  @ApiResponse({ status: 401, description: 'Mật khẩu hiện tại không đúng' })
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.profileService.requestPasswordChange(user.sub, dto);
  }

  @Get('confirm-password-change')
  @Public()
  @ApiOperation({ summary: 'Xác nhận đổi mật khẩu qua link email (không cần xác thực)' })
  @ApiQuery({ name: 'token', required: true, description: 'Token xác nhận từ email' })
  @ApiResponse({ status: 200, description: 'Trả về trang HTML thông báo kết quả' })
  async confirmPasswordChange(
    @Query('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const { employeeEmail } = await this.profileService.confirmPasswordChange(token);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(successHtml(employeeEmail));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(400).send(errorHtml(msg));
    }
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Cập nhật ảnh đại diện' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ type: AvatarResponseDto })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  updateAvatar(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<AvatarResponseDto> {
    return this.profileService.updateAvatar(user.sub, file);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Lịch sử hoạt động của nhân viên đang đăng nhập (có phân trang)' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Số trang (mặc định 1)' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Số bản ghi mỗi trang (mặc định 20, tối đa 100)' })
  @ApiOkResponse({ type: PaginatedAuditLogDto })
  getAuditLogs(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
    return this.profileService.getAuditLogs(user.sub, p, l);
  }
}

// ─── HTML response pages ──────────────────────────────────────────────────────

function successHtml(email: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Đổi mật khẩu thành công</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}
    .card{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.1);padding:48px 40px;max-width:480px;width:100%;text-align:center}
    .icon{font-size:56px;margin-bottom:20px}
    h1{color:#166534;font-size:22px;font-weight:700;margin-bottom:12px}
    p{color:#374151;font-size:15px;line-height:1.6;margin-bottom:8px}
    .email{color:#4f46e5;font-weight:600}
    .note{color:#6b7280;font-size:13px;margin-top:20px}
    a{display:inline-block;margin-top:28px;padding:12px 28px;background:#1e1b4b;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Đổi mật khẩu thành công!</h1>
    <p>Mật khẩu của tài khoản <span class="email">${email}</span> đã được cập nhật.</p>
    <p>Bạn có thể đăng nhập lại bằng mật khẩu mới ngay bây giờ.</p>
    <p class="note">Phiên đăng nhập hiện tại vẫn còn hiệu lực. Vì lý do bảo mật, hãy đăng xuất và đăng nhập lại.</p>
    <a href="http://localhost:3001">← Quay về trang quản trị</a>
  </div>
</body>
</html>`;
}

function errorHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Xác nhận thất bại</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}
    .card{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.1);padding:48px 40px;max-width:480px;width:100%;text-align:center}
    .icon{font-size:56px;margin-bottom:20px}
    h1{color:#991b1b;font-size:22px;font-weight:700;margin-bottom:12px}
    p{color:#374151;font-size:15px;line-height:1.6;margin-bottom:8px}
    .msg{color:#b91c1c;font-weight:500;background:#fef2f2;padding:10px 16px;border-radius:8px;font-size:14px;margin:16px 0}
    a{display:inline-block;margin-top:24px;padding:12px 28px;background:#1e1b4b;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">❌</div>
    <h1>Xác nhận thất bại</h1>
    <p>Không thể thay đổi mật khẩu của bạn.</p>
    <div class="msg">${message}</div>
    <p>Vui lòng thực hiện lại yêu cầu đổi mật khẩu từ trang quản trị.</p>
    <a href="http://localhost:3001">← Quay về trang quản trị</a>
  </div>
</body>
</html>`;
}
