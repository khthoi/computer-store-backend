import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Banner } from './entities/banner.entity';
import { HomepageSection } from './entities/homepage-section.entity';
import { HomepageSectionItem } from './entities/homepage-section-item.entity';
import { Page } from './entities/page.entity';
import { FaqGroup } from './entities/faq-group.entity';
import { FaqItem } from './entities/faq-item.entity';
import { Menu } from './entities/menu.entity';
import { MenuItem } from './entities/menu-item.entity';
import { Popup } from './entities/popup.entity';
import { AnnouncementBar } from './entities/announcement-bar.entity';
import { SiteConfig } from './entities/site-config.entity';
import { RedisModule } from '../../common/redis/redis.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { BannersService } from './services/banners.service';
import { HomepageService } from './services/homepage.service';
import { HomepagePreviewService } from './services/homepage-preview.service';
import { StorefrontHomeService } from './services/storefront-home.service';
import { FlashSalesModule } from '../flash-sales/flash-sales.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { PagesService } from './services/pages.service';
import { FaqService } from './services/faq.service';
import { MenuService } from './services/menu.service';
import { PopupsService } from './services/popups.service';
import { AnnouncementBarsService } from './services/announcement-bars.service';
import { SiteConfigService } from './services/site-config.service';
import { CmsController } from './controllers/cms.controller';
import { AdminCmsController } from './controllers/admin-cms.controller';
import { AdminCmsHomepageController } from './controllers/admin-cms-homepage.controller';
import { AdminCmsContentController } from './controllers/admin-cms-content.controller';
import { AdminCmsAnnouncementsController } from './controllers/admin-cms-announcements.controller';
import { StorefrontHomeController } from './controllers/storefront-home.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Banner,
      HomepageSection,
      HomepageSectionItem,
      Page,
      FaqGroup,
      FaqItem,
      Menu,
      MenuItem,
      Popup,
      AnnouncementBar,
      SiteConfig,
    ]),
    RedisModule,
    AuditLogsModule,
    FlashSalesModule,
    PromotionsModule,
  ],
  controllers: [
    CmsController,
    AdminCmsController,
    AdminCmsHomepageController,
    AdminCmsContentController,
    AdminCmsAnnouncementsController,
    StorefrontHomeController,
  ],
  providers: [
    BannersService,
    HomepageService,
    HomepagePreviewService,
    StorefrontHomeService,
    PagesService,
    FaqService,
    MenuService,
    PopupsService,
    AnnouncementBarsService,
    SiteConfigService,
  ],
  exports: [SiteConfigService],
})
export class CmsModule {}
