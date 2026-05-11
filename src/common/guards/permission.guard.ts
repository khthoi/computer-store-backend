import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/permission.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RolesService } from '../../modules/roles/roles.service';
import { RedisService } from '../redis/redis.service';

const ROLE_PERM_TTL = 600;

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolesService: RolesService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermission) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || user.type !== 'employee') return false;

    const roleNames: string[] = user.roles ?? [];
    if (roleNames.length === 0) return false;

    const userPermissions = await this.resolvePermissions(roleNames);
    if (!userPermissions.has(requiredPermission)) {
      throw new ForbiddenException(`Bạn không có quyền: ${requiredPermission}`);
    }
    return true;
  }

  private async resolvePermissions(roleNames: string[]): Promise<Set<string>> {
    const permSet = new Set<string>();
    for (const roleName of roleNames) {
      const perms = await this.redisService.cache<string[]>(
        `role:permissions:${roleName}`,
        ROLE_PERM_TTL,
        async () => {
          const role = await this.rolesService.findByName(roleName);
          return role?.permissions?.map((p) => p.maQuyen) ?? [];
        },
      );
      perms.forEach((p) => permSet.add(p));
    }
    return permSet;
  }
}
