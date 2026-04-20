import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

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

  // Generic cache helpers
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
