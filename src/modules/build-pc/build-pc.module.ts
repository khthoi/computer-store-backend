import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildSlot } from './entities/build-slot.entity';
import { CompatibilityRule } from './entities/compatibility-rule.entity';
import { SavedBuild } from './entities/saved-build.entity';
import { BuildDetail } from './entities/build-detail.entity';
import { SpecType } from '../specifications/entities/spec-type.entity';
import { SpecValue } from '../specifications/entities/spec-value.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Category } from '../categories/entities/category.entity';
import { CategorySpecGroup } from '../specifications/entities/category-spec-group.entity';
import { BuildPcService } from './build-pc.service';
import { BuildPcCompatibilityEngine } from './build-pc-compatibility.engine';
import { BuildPcController } from './build-pc.controller';
import { AdminBuildPcController } from './admin-build-pc.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([BuildSlot, CompatibilityRule, SavedBuild, BuildDetail, SpecType, SpecValue, ProductVariant, Category, CategorySpecGroup]), AuditLogsModule],
  controllers: [BuildPcController, AdminBuildPcController],
  providers: [BuildPcService, BuildPcCompatibilityEngine],
  exports: [BuildPcService, TypeOrmModule],
})
export class BuildPcModule {}
