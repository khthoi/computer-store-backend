import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('MAIL_HOST', 'smtp.gmail.com'),
      port: config.get<number>('MAIL_PORT', 587),
      secure: config.get<string>('MAIL_PORT', '587') === '465',
      auth: {
        user: config.get<string>('MAIL_USER'),
        pass: config.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendPasswordChangeConfirmation(opts: {
    to: string;
    fullName: string;
    confirmLink: string;
    expiresMinutes: number;
  }): Promise<void> {
    const { to, fullName, confirmLink, expiresMinutes } = opts;
    const from = this.config.get<string>('MAIL_FROM', '"PC Store Admin" <noreply@pcstore.vn>');

    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Xác nhận thay đổi mật khẩu</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#1e1b4b;padding:32px 40px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
              🔐 PC Store Admin
            </h1>
            <p style="margin:6px 0 0;color:#a5b4fc;font-size:13px;">Hệ thống quản trị bán lẻ máy tính</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 24px;">
            <h2 style="margin:0 0 16px;color:#1e1b4b;font-size:20px;font-weight:700;">
              Xác nhận thay đổi mật khẩu
            </h2>
            <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">
              Xin chào <strong>${fullName}</strong>,
            </p>
            <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
              Chúng tôi nhận được yêu cầu thay đổi mật khẩu cho tài khoản <strong>${to}</strong> trên hệ thống PC Store Admin.
              Nhấn vào nút bên dưới để xác nhận thay đổi mật khẩu của bạn.
            </p>
            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="background:#4f46e5;border-radius:8px;">
                  <a href="${confirmLink}"
                     style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                    ✅ Xác nhận thay đổi mật khẩu
                  </a>
                </td>
              </tr>
            </table>
            <!-- Expiry notice -->
            <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
              <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
                ⏰ <strong>Lưu ý:</strong> Đường link xác nhận này sẽ <strong>hết hiệu lực sau ${expiresMinutes} phút</strong> kể từ khi email được gửi.
                Nếu hết hạn, bạn cần thực hiện lại yêu cầu đổi mật khẩu.
              </p>
            </div>
            <!-- Security warning -->
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
              <p style="margin:0;color:#991b1b;font-size:13px;line-height:1.5;">
                🚨 <strong>Không phải bạn?</strong> Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.
                Mật khẩu của bạn sẽ không thay đổi. Tuy nhiên, hãy xem xét liên hệ quản trị viên hệ thống ngay lập tức.
              </p>
            </div>
            <!-- Fallback link -->
            <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.6;">
              Nếu nút trên không hoạt động, sao chép và dán đường link sau vào trình duyệt:<br/>
              <a href="${confirmLink}" style="color:#4f46e5;word-break:break-all;">${confirmLink}</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;">
            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
              Email này được gửi tự động từ hệ thống PC Store Admin. Vui lòng không trả lời email này.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({ from, to, subject: '[PC Store] Xác nhận thay đổi mật khẩu', html });
      this.logger.log(`Password change confirmation email sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}`, err);
      throw new Error('Không thể gửi email xác nhận. Vui lòng thử lại sau.');
    }
  }
}
