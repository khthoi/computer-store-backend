import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteConfig } from '../cms/entities/site-config.entity';
import { RedisService } from '../../common/redis/redis.service';

const CACHE_TTL = 600;
const CACHE_KEY_ALL = 'site_config:all'; // shared with CmsModule — must invalidate on update

const GROUP_PREFIX = {
  general: 'general.',
  payment: 'payment.',
  shipping: 'shipping.',
  notification: 'notification.',
  tax: 'tax.',
} as const;

type GroupName = keyof typeof GROUP_PREFIX;

// Keys hidden from GET response (returned as masked value)
const SENSITIVE_KEYS = new Set([
  'payment.vnpay_hash_secret',
  'payment.momo_access_key',
  'payment.momo_secret_key',
]);

const PUBLIC_KEYS = new Set([
  'general.site_name',
  'general.logo_url',
  'general.favicon_url',
  'general.contact_email',
  'general.contact_phone',
  'general.address',
  'general.social_facebook',
  'general.social_zalo',
  'general.meta_description',
]);

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SiteConfig)
    private readonly repo: Repository<SiteConfig>,
    private readonly redisService: RedisService,
  ) {}

  async getGroup(group: GroupName): Promise<Record<string, string>> {
    const cacheKey = `settings:${group}`;
    return this.redisService.cache(cacheKey, CACHE_TTL, async () => {
      const prefix = GROUP_PREFIX[group];
      const rows = await this.repo
        .createQueryBuilder('c')
        .where('c.config_key LIKE :prefix', { prefix: `${prefix}%` })
        .getMany();

      return Object.fromEntries(
        rows.map((r) => [
          r.key.replace(prefix, ''),
          SENSITIVE_KEYS.has(r.key) ? '***' : r.value,
        ]),
      );
    });
  }

  async updateGroup(
    group: GroupName,
    data: Record<string, string | undefined>,
    updatedById: number,
  ): Promise<Record<string, string>> {
    const prefix = GROUP_PREFIX[group];
    const entries = Object.entries(data).filter(([, v]) => v !== undefined) as [string, string][];

    if (entries.length > 0) {
      const upsertRows = entries.map(([k, v]) => ({
        key: `${prefix}${k}`,
        value: v,
        updatedById,
      }));

      await this.repo.upsert(upsertRows, {
        conflictPaths: ['key'],
        skipUpdateIfNoValuesChanged: true,
      });
    }

    await this.redisService.invalidate(`settings:${group}`);
    await this.redisService.invalidate(CACHE_KEY_ALL);

    return this.getGroup(group);
  }

  async getPublicConfig(): Promise<Record<string, string>> {
    return this.redisService.cache('settings:public', CACHE_TTL, async () => {
      const rows = await this.repo
        .createQueryBuilder('c')
        .where('c.config_key IN (:...keys)', { keys: [...PUBLIC_KEYS] })
        .getMany();

      return Object.fromEntries(
        rows.map((r) => [r.key.replace('general.', ''), r.value]),
      );
    });
  }
}
