import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './entities/employee.entity';
import { Role } from '../roles/entities/role.entity';
import { AuditLog } from './entities/audit-log.entity';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { ProfileService } from './profile.service';
import { AdminProfileController } from './admin-profile.controller';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, Role, AuditLog]), MediaModule],
  controllers: [EmployeesController, AdminProfileController],
  providers: [EmployeesService, ProfileService],
  exports: [EmployeesService, ProfileService],
})
export class EmployeesModule {}
