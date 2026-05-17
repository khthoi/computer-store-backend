import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/permission.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RolesService } from '../../modules/roles/roles.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolesService: RolesService,
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

    const userPermissions = await this.rolesService.getPermissionsForRoles(roleNames);
    if (!userPermissions.includes(requiredPermission)) {
      throw new ForbiddenException(`Bạn không có quyền: ${requiredPermission}`);
    }
    return true;
  }
}
