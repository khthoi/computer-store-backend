import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../common/redis/redis.service';

export interface JwtPayload {
  sub: number;
  email: string;
  type: 'customer' | 'employee';
  roles: string[];
  jti: string;
  sessionJti?: string; // chỉ có trong refresh token của customer (trỏ đến access JTI tương ứng)
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret', 'fallback_secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload & { id: number }> {
    if (payload.jti && (await this.redisService.isTokenBlacklisted(payload.jti))) {
      throw new UnauthorizedException('Token đã bị thu hồi');
    }

    if (payload.type === 'customer') {
      const valid = await this.redisService.isCustomerSessionValid(payload.sub, payload.jti);
      if (!valid) {
        throw new UnauthorizedException('Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại');
      }
    } else {
      const activeJti = await this.redisService.getActiveJti(payload.sub, payload.type);
      if (!activeJti || activeJti !== payload.jti) {
        throw new UnauthorizedException('Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại');
      }
    }

    return { ...payload, id: payload.sub };
  }
}
