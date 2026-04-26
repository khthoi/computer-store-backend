import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpecGroup } from './entities/spec-group.entity';
import { SpecType } from './entities/spec-type.entity';
import { CategorySpecGroup } from './entities/category-spec-group.entity';
import { SpecValue } from './entities/spec-value.entity';
import { Category } from '../categories/entities/category.entity';
import { SpecificationsService } from './specifications.service';
import { SpecificationsController } from './specifications.controller';
import { AdminSpecificationsController } from './admin-specifications.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SpecGroup, SpecType, CategorySpecGroup, SpecValue, Category])],
  controllers: [SpecificationsController, AdminSpecificationsController],
  providers: [SpecificationsService],
  exports: [SpecificationsService, TypeOrmModule],
})
export class SpecificationsModule {}
