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
import { ProductBrand } from '../brands/entities/product-brand.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { FlashSaleItem } from '../flash-sales/entities/flash-sale-item.entity';
import { BuildPcService } from './build-pc.service';
import { SavedBuildsService } from './saved-builds.service';
import { CommunityBuildsService } from './community-builds.service';
import { BuildPcCompatibilityEngine } from './build-pc-compatibility.engine';
import { BuildPcController } from './build-pc.controller';
import { AdminBuildPcController } from './admin-build-pc.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { Customer } from '../users/entities/customer.entity';
import { ProductImage } from '../products/entities/product-image.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BuildSlot,
      CompatibilityRule,
      SavedBuild,
      BuildDetail,
      SpecType,
      SpecValue,
      ProductVariant,
      Category,
      CategorySpecGroup,
      ProductBrand,
      Promotion,
      FlashSaleItem,
      Customer,
      ProductImage,
    ]),
    AuditLogsModule,
  ],
  controllers: [BuildPcController, AdminBuildPcController],
  providers: [BuildPcService, SavedBuildsService, CommunityBuildsService, BuildPcCompatibilityEngine],
  exports: [BuildPcService, TypeOrmModule],
})
export class BuildPcModule {}
