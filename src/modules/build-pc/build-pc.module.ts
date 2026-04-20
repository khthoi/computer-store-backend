import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildSlot } from './entities/build-slot.entity';
import { CompatibilityRule } from './entities/compatibility-rule.entity';
import { SavedBuild } from './entities/saved-build.entity';
import { BuildDetail } from './entities/build-detail.entity';
import { BuildPcService } from './build-pc.service';
import { BuildPcController } from './build-pc.controller';
import { AdminBuildPcController } from './admin-build-pc.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BuildSlot, CompatibilityRule, SavedBuild, BuildDetail])],
  controllers: [BuildPcController, AdminBuildPcController],
  providers: [BuildPcService],
  exports: [BuildPcService, TypeOrmModule],
})
export class BuildPcModule {}
