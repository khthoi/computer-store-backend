import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteConfig } from '../entities/site-config.entity';
import { UpsertSiteConfigDto } from '../dto/upsert-site-config.dto';
import { RedisService } from '../../../common/redis/redis.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import {
  PublicCategoryShortcutDto,
  PublicTrustBadgeDto,
} from '../dto/public-content.dto';

const CACHE_KEY = 'site_config:all';
const CACHE_TTL = 600; // 10 minutes

export type HomepageHeroMode = 'banner' | 'slider';
export const HOMEPAGE_HERO_MODE_KEY = 'homepage_hero_mode';
export const HOMEPAGE_HERO_MODE_DEFAULT: HomepageHeroMode = 'banner';

@Injectable()
export class SiteConfigService {
  constructor(
    @InjectRepository(SiteConfig)
    private readonly repo: Repository<SiteConfig>,
    private readonly redisService: RedisService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(): Promise<Record<string, string>> {
    return this.redisService.cache(CACHE_KEY, CACHE_TTL, async () => {
      const configs = await this.repo.find();
      return Object.fromEntries(configs.map((c) => [c.key, c.value]));
    });
  }

  async getTrustBadges(): Promise<PublicTrustBadgeDto[]> {
    const configs = await this.findAll();
    return this.parseJsonConfig<{
      id?: string;
      icon?: string;
      title?: string;
      subtitle?: string;
      active?: boolean;
      sortOrder?: number;
    }>(configs.trust_badges)
      .filter((item) => item.active === true)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((item, index) => ({
        id: item.id ?? `tb-${index + 1}`,
        icon: item.icon ?? 'ShieldCheckIcon',
        title: item.title ?? '',
        subtitle: item.subtitle ?? null,
        sortOrder: item.sortOrder ?? index + 1,
      }));
  }

  async getCategoryShortcuts(): Promise<PublicCategoryShortcutDto[]> {
    const configs = await this.findAll();
    return this.parseJsonConfig<{
      id?: string;
      emoji?: string;
      iconUrl?: string;
      label?: string;
      url?: string;
      active?: boolean;
      sortOrder?: number;
    }>(configs.category_shortcuts)
      .filter((item) => item.active === true)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((item, index) => ({
        id: item.id ?? `cs-${index + 1}`,
        emoji: item.emoji?.trim() ? item.emoji : null,
        iconUrl: item.iconUrl?.trim() ? item.iconUrl : null,
        label: item.label ?? '',
        url: item.url ?? '#',
        sortOrder: item.sortOrder ?? index + 1,
      }));
  }

  async getHomepageHeroMode(): Promise<HomepageHeroMode> {
    const configs = await this.findAll();
    const raw = configs[HOMEPAGE_HERO_MODE_KEY];
    return raw === 'slider' ? 'slider' : HOMEPAGE_HERO_MODE_DEFAULT;
  }

  async findOne(key: string): Promise<SiteConfig> {
    const config = await this.repo.findOne({ where: { key } });
    if (!config) throw new NotFoundException(`Config '${key}' không tồn tại`);
    return config;
  }

  async upsert(key: string, dto: UpsertSiteConfigDto, updatedById: number): Promise<SiteConfig> {
    const existing = await this.repo.findOne({ where: { key } });
    await this.repo.upsert(
      { key, value: dto.value, updatedById },
      { conflictPaths: ['key'], skipUpdateIfNoValuesChanged: true },
    );
    await this.redisService.invalidate(CACHE_KEY);
    if (existing) {
      this.auditLogsService.log({
        entityType: 'SiteConfig',
        entityId: key,
        entityLabel: `Cấu hình: ${key}`,
        actionType: 'CapNhat',
        actionDetail: `Cập nhật cấu hình hệ thống "${key}"`,
        before: JSON.stringify({ key, value: existing.value }),
        after: JSON.stringify({ key, value: dto.value }),
      });
    } else {
      this.auditLogsService.log({
        entityType: 'SiteConfig',
        entityId: key,
        entityLabel: `Cấu hình: ${key}`,
        actionType: 'TaoMoi',
        actionDetail: `Tạo cấu hình hệ thống "${key}"`,
        after: JSON.stringify({ key, value: dto.value }),
      });
    }
    return this.findOne(key);
  }

  async remove(key: string): Promise<void> {
    const config = await this.findOne(key);
    await this.repo.delete(config.key);
    await this.redisService.invalidate(CACHE_KEY);
    this.auditLogsService.log({
      entityType: 'SiteConfig',
      entityId: key,
      entityLabel: `Cấu hình: ${key}`,
      actionType: 'Xoa',
      actionDetail: `Xóa cấu hình hệ thống "${key}" (chỉ admin)`,
      before: JSON.stringify({ key, value: config.value }),
    });
  }

  private parseJsonConfig<T>(raw?: string): T[] {
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
}
