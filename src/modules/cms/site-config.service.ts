import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteConfig } from './entities/site-config.entity';
import { UpsertSiteConfigDto } from './dto/upsert-site-config.dto';
import { RedisService } from '../../common/redis/redis.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const CACHE_KEY = 'site_config:all';
const CACHE_TTL = 600; // 10 minutes

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
}
