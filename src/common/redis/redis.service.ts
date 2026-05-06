import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 3600;

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const count = await this.redis.exists(key);
    return count > 0;
  }

  // JWT blacklist helpers
  async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    await this.set(`bl:${jti}`, '1', ttlSeconds);
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    return this.exists(`bl:${jti}`);
  }

  // Active access token jti helpers (single-session enforcement)
  async saveActiveJti(userId: number, type: string, jti: string, ttlSeconds: number): Promise<void> {
    await this.set(`ajti:${type}:${userId}`, jti, ttlSeconds);
  }

  async getActiveJti(userId: number, type: string): Promise<string | null> {
    return this.get(`ajti:${type}:${userId}`);
  }

  async deleteActiveJti(userId: number, type: string): Promise<void> {
    await this.del(`ajti:${type}:${userId}`);
  }

  // Refresh token helpers
  async saveRefreshToken(userId: number, type: string, token: string, ttlSeconds: number): Promise<void> {
    await this.set(`rt:${type}:${userId}`, token, ttlSeconds);
  }

  async getRefreshToken(userId: number, type: string): Promise<string | null> {
    return this.get(`rt:${type}:${userId}`);
  }

  async deleteRefreshToken(userId: number, type: string): Promise<void> {
    await this.del(`rt:${type}:${userId}`);
  }

  // ─── Customer multi-session (Redis Sorted Set: score=expiry_ms, member=jti) ──

  private readonly CUSTOMER_SESSION_CAP = 5;
  private readonly CUSTOMER_SESSION_KEY = (id: number) => `sessions:customer:${id}`;
  private readonly CUSTOMER_RT_KEY = (id: number) => `customer_rts:${id}`;

  async addCustomerSession(userId: number, jti: string, ttlSeconds: number): Promise<void> {
    const key = this.CUSTOMER_SESSION_KEY(userId);
    const now = Date.now();
    const expiry = now + ttlSeconds * 1000;

    await this.redis.zremrangebyscore(key, 0, now);

    const count = await this.redis.zcard(key);
    if (count >= this.CUSTOMER_SESSION_CAP) {
      await this.redis.zremrangebyrank(key, 0, count - this.CUSTOMER_SESSION_CAP);
    }

    await this.redis.zadd(key, expiry, jti);
    await this.redis.expire(key, REFRESH_TOKEN_TTL_SECONDS);
  }

  async isCustomerSessionValid(userId: number, jti: string): Promise<boolean> {
    const score = await this.redis.zscore(this.CUSTOMER_SESSION_KEY(userId), jti);
    if (!score) return false;
    return Date.now() < Number(score);
  }

  async removeCustomerSession(userId: number, jti: string): Promise<void> {
    await this.redis.zrem(this.CUSTOMER_SESSION_KEY(userId), jti);
  }

  async clearAllCustomerSessions(userId: number): Promise<void> {
    await this.redis.del(this.CUSTOMER_SESSION_KEY(userId));
    await this.redis.del(this.CUSTOMER_RT_KEY(userId));
  }

  async addCustomerRefreshToken(userId: number, sessionJti: string, refreshToken: string): Promise<void> {
    const key = this.CUSTOMER_RT_KEY(userId);
    await this.redis.hset(key, sessionJti, refreshToken);
    await this.redis.expire(key, REFRESH_TOKEN_TTL_SECONDS);
  }

  async getCustomerRefreshToken(userId: number, sessionJti: string): Promise<string | null> {
    return this.redis.hget(this.CUSTOMER_RT_KEY(userId), sessionJti);
  }

  async removeCustomerRefreshToken(userId: number, sessionJti: string): Promise<void> {
    await this.redis.hdel(this.CUSTOMER_RT_KEY(userId), sessionJti);
  }

  async getTtlMs(key: string): Promise<number> {
    const ms = await this.redis.pttl(key);
    return ms < 0 ? 0 : ms;
  }

  // ─── Generic cache helpers ────────────────────────────────────────────────
  async cache<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get(key);
    if (cached) return JSON.parse(cached) as T;
    const data = await factory();
    await this.set(key, JSON.stringify(data), ttlSeconds);
    return data;
  }

  async invalidate(key: string): Promise<void> {
    await this.del(key);
  }
}
