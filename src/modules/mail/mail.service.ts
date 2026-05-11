import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

function emailLayout(title: string, bodyRows: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border:1px solid #cccccc;">
        <!-- Header -->
        <tr>
          <td style="background:#1a1a2e;padding:20px 36px;border-bottom:3px solid #333366;">
            <p style="margin:0;color:#ffffff;font-size:17px;font-weight:bold;letter-spacing:0.5px;">
              PC STORE — HỆ THỐNG QUẢN TRỊ
            </p>
            <p style="margin:4px 0 0;color:#aaaacc;font-size:12px;">
              Thông báo hệ thống — Email tự động
            </p>
          </td>
        </tr>
        ${bodyRows}
        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #dddddd;padding:16px 36px;background:#f8f8f8;">
            <p style="margin:0;color:#888888;font-size:11px;line-height:1.6;">
              Đây là email được gửi tự động từ hệ thống PC Store. Vui lòng <strong>không trả lời</strong> email này.<br/>
              Nếu bạn cần hỗ trợ, hãy liên hệ quản trị viên hệ thống qua kênh nội bộ.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaRow(href: string, label: string): string {
  return `<tr>
  <td style="padding:0 0 20px;">
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#1a1a2e;border:1px solid #333366;">
          <a href="${href}"
             style="display:inline-block;padding:11px 28px;color:#ffffff;font-size:14px;
                    font-weight:bold;text-decoration:none;letter-spacing:0.3px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

function noticeRow(text: string): string {
  return `<tr>
  <td style="padding:0 0 16px;">
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border-left:3px solid #333366;background:#f5f5fa;">
      <tr>
        <td style="padding:10px 14px;color:#333333;font-size:13px;line-height:1.6;">
          ${text}
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

function fallbackLinkRow(href: string): string {
  return `<tr>
  <td style="padding:0 0 8px;">
    <p style="margin:0;color:#666666;font-size:12px;line-height:1.7;">
      Nếu nút trên không hoạt động, sao chép đường liên kết sau và dán vào trình duyệt:<br/>
      <a href="${href}" style="color:#333366;word-break:break-all;">${href}</a>
    </p>
  </td>
</tr>`;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

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

  private get from(): string {
    return this.config.get<string>('MAIL_FROM', '"PC Store" <noreply@pcstore.vn>');
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`Email sent → ${to} | ${subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email → ${to}`, err);
      throw new Error('Không thể gửi email. Vui lòng thử lại sau.');
    }
  }

  // -------------------------------------------------------------------------

  async sendPasswordChangeConfirmation(opts: {
    to: string;
    fullName: string;
    confirmLink: string;
    expiresMinutes: number;
  }): Promise<void> {
    const { to, fullName, confirmLink, expiresMinutes } = opts;

    const body = `
<tr>
  <td style="padding:28px 36px 8px;">
    <p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#1a1a2e;">
      Xác nhận thay đổi mật khẩu
    </p>
    <p style="margin:0 0 20px;color:#888888;font-size:12px;">
      Yêu cầu thay đổi mật khẩu — ${new Date().toLocaleString('vi-VN')}
    </p>
    <p style="margin:0 0 10px;color:#222222;font-size:14px;line-height:1.7;">
      Kính gửi <strong>${fullName}</strong>,
    </p>
    <p style="margin:0 0 20px;color:#222222;font-size:14px;line-height:1.7;">
      Hệ thống PC Store đã nhận được yêu cầu thay đổi mật khẩu cho tài khoản
      <strong>${to}</strong>. Để xác nhận thao tác này, vui lòng nhấn vào nút bên dưới.
    </p>
    ${ctaRow(confirmLink, 'XÁC NHẬN THAY ĐỔI MẬT KHẨU')}
    ${noticeRow(`<strong>Thời hạn hiệu lực:</strong> Đường liên kết trên sẽ <strong>hết hiệu lực sau ${expiresMinutes} phút</strong> kể từ thời điểm email được gửi. Sau khi hết hạn, bạn cần thực hiện lại yêu cầu đổi mật khẩu từ đầu.`)}
    ${noticeRow(`<strong>Lưu ý bảo mật:</strong> Nếu bạn <em>không</em> thực hiện yêu cầu này, hãy bỏ qua email. Mật khẩu của bạn sẽ <strong>không thay đổi</strong>. Tuy nhiên, nếu nghi ngờ tài khoản bị xâm phạm, hãy liên hệ quản trị viên hệ thống ngay lập tức.`)}
    ${fallbackLinkRow(confirmLink)}
  </td>
</tr>`;

    const html = emailLayout('Xác nhận thay đổi mật khẩu', body);
    await this.send(to, '[PC Store] Xác nhận thay đổi mật khẩu', html);
  }

  // -------------------------------------------------------------------------

  async sendWelcomeWithResetLink(opts: {
    to: string;
    fullName: string;
    resetLink: string;
    expiresHours: number;
  }): Promise<void> {
    const { to, fullName, resetLink, expiresHours } = opts;

    const body = `
<tr>
  <td style="padding:28px 36px 8px;">
    <p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#1a1a2e;">
      Thông báo tạo tài khoản
    </p>
    <p style="margin:0 0 20px;color:#888888;font-size:12px;">
      Tài khoản khách hàng — ${new Date().toLocaleString('vi-VN')}
    </p>
    <p style="margin:0 0 10px;color:#222222;font-size:14px;line-height:1.7;">
      Kính gửi <strong>${fullName}</strong>,
    </p>
    <p style="margin:0 0 20px;color:#222222;font-size:14px;line-height:1.7;">
      Quản trị viên hệ thống vừa tạo tài khoản khách hàng tại <strong>PC Store</strong>
      với địa chỉ email <strong>${to}</strong>.
      Vui lòng nhấn vào nút bên dưới để thiết lập mật khẩu và kích hoạt tài khoản.
    </p>
    ${ctaRow(resetLink, 'THIẾT LẬP MẬT KHẨU')}
    ${noticeRow(`<strong>Thời hạn hiệu lực:</strong> Đường liên kết trên sẽ <strong>hết hiệu lực sau ${expiresHours} giờ</strong>. Sau khi hết hạn, bạn có thể yêu cầu gửi lại liên kết thông qua trang đăng nhập.`)}
    ${noticeRow(`<strong>Lưu ý:</strong> Nếu bạn <em>không</em> biết về tài khoản này hoặc không yêu cầu tạo tài khoản, hãy bỏ qua email này và liên hệ quản trị viên hệ thống để được hỗ trợ.`)}
    ${fallbackLinkRow(resetLink)}
  </td>
</tr>`;

    const html = emailLayout('Thông báo tạo tài khoản', body);
    await this.send(to, '[PC Store] Thiết lập mật khẩu tài khoản', html);
  }
}
