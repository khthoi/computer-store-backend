import { Injectable, NestMiddleware } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Request, Response, NextFunction } from 'express';

interface DecodedJwt {
  sub?: number;
  email?: string;
  type?: string;
  roles?: string[];
  name?: string; // employee display name — present in employee access tokens
  code?: string; // maNhanVien — present in employee access tokens
}

@Injectable()
export class AuditContextMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // cls.run() initializes a new AsyncLocalStorage context for this request
    this.cls.run(() => {
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
        req.ip ??
        null;
      const userAgent = (req.headers['user-agent'] as string) ?? null;

      this.cls.set('ipAddress', ip);
      this.cls.set('userAgent', userAgent);

      const authHeader = req.headers['authorization'];
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
          // Decode only — guard has already verified the signature
          const payloadB64 = token.split('.')[1];
          const decoded: DecodedJwt = JSON.parse(
            Buffer.from(payloadB64, 'base64url').toString('utf8'),
          );
          if (decoded?.sub && decoded.type === 'employee') {
            this.cls.set('actorId', decoded.sub);
            this.cls.set('actorName', decoded.name ?? decoded.email ?? '');
            this.cls.set('actorCode', decoded.code ?? null);
            this.cls.set('actorRole', JSON.stringify(decoded.roles ?? []));
            this.cls.set('actorAvatarUrl', null);
          }
        } catch {
          // Malformed token — leave actor fields unset (treated as system action)
        }
      }

      next();
    });
  }
}
