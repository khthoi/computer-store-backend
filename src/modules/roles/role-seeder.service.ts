import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RedisService } from '../../common/redis/redis.service';
import {
  PERMISSION_CATALOG,
  SYSTEM_ROLES,
  resolveRolePermissions,
} from './role-seed.constants';

/**
 * Reconciles the DB role/permission catalog to match `role-seed.constants.ts`
 * on every app bootstrap. System roles are flagged `isSystem=true` and their
 * permission mappings are forced back to the canonical state — any manual DB
 * edits to system roles are reverted on next restart.
 */
@Injectable()
export class RoleSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RoleSeederService.name);

  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission) private readonly permRepo: Repository<Permission>,
    private readonly redisService: RedisService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.seedPermissions();
      await this.seedRoles();
      await this.invalidateCaches();
      this.logger.log(`RBAC seed reconciled: ${PERMISSION_CATALOG.length} permissions, ${SYSTEM_ROLES.length} system roles`);
    } catch (err) {
      this.logger.error('RBAC seed failed', err as Error);
    }
  }

  private async seedPermissions(): Promise<void> {
    const existing = await this.permRepo.find();
    const existingByCode = new Map(existing.map((p) => [p.maQuyen, p]));

    const toInsert: Partial<Permission>[] = [];
    const toUpdate: Permission[] = [];

    for (const def of PERMISSION_CATALOG) {
      const found = existingByCode.get(def.maQuyen);
      if (!found) {
        toInsert.push({
          maQuyen: def.maQuyen,
          tenQuyen: def.tenQuyen,
          module: def.module,
          hanhDong: def.hanhDong,
        });
      } else if (
        found.tenQuyen !== def.tenQuyen ||
        found.module !== def.module ||
        found.hanhDong !== def.hanhDong
      ) {
        found.tenQuyen = def.tenQuyen;
        found.module = def.module;
        found.hanhDong = def.hanhDong;
        toUpdate.push(found);
      }
    }

    if (toInsert.length > 0) await this.permRepo.insert(toInsert);
    if (toUpdate.length > 0) await this.permRepo.save(toUpdate);
  }

  private async seedRoles(): Promise<void> {
    const allCodes = SYSTEM_ROLES.flatMap((r) => resolveRolePermissions(r));
    const uniqueCodes = Array.from(new Set(allCodes));
    const perms = await this.permRepo.findBy({ maQuyen: In(uniqueCodes) });
    const permByCode = new Map(perms.map((p) => [p.maQuyen, p]));

    for (const def of SYSTEM_ROLES) {
      let role = await this.roleRepo.findOne({
        where: { tenVaiTro: def.tenVaiTro },
        relations: ['permissions'],
      });

      const targetPerms = resolveRolePermissions(def)
        .map((code) => permByCode.get(code))
        .filter((p): p is Permission => p !== undefined);

      if (!role) {
        role = this.roleRepo.create({
          tenVaiTro: def.tenVaiTro,
          moTa: def.moTa,
          isSystem: true,
          permissions: targetPerms,
        });
        await this.roleRepo.save(role);
        continue;
      }

      const currentCodes = new Set((role.permissions ?? []).map((p) => p.maQuyen));
      const targetCodes = new Set(targetPerms.map((p) => p.maQuyen));
      const sameSize = currentCodes.size === targetCodes.size;
      const samePerms = sameSize && [...currentCodes].every((c) => targetCodes.has(c));

      const needsUpdate =
        role.moTa !== def.moTa || role.isSystem !== true || !samePerms;

      if (needsUpdate) {
        role.moTa = def.moTa;
        role.isSystem = true;
        role.permissions = targetPerms;
        await this.roleRepo.save(role);
      }
    }
  }

  private async invalidateCaches(): Promise<void> {
    await this.redisService.invalidate('cache:permissions:all');
    for (const def of SYSTEM_ROLES) {
      await this.redisService.invalidate(`role:permissions:${def.tenVaiTro}`);
    }
  }
}
