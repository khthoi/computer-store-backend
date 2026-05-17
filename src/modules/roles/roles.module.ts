import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolesService } from './roles.service';
import { RoleSeederService } from './role-seeder.service';
import { RolesController, PermissionsController } from './roles.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission]), AuditLogsModule],
  controllers: [RolesController, PermissionsController],
  providers: [RolesService, RoleSeederService],
  exports: [RolesService],
})
export class RolesModule {}
