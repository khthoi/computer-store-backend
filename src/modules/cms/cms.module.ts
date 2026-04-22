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
import { SiteConfig } from './entities/site-config.entity';
import { RedisModule } from '../../common/redis/redis.module';
import { BannersService } from './banners.service';
import { HomepageService } from './homepage.service';
import { PagesService } from './pages.service';
import { FaqService } from './faq.service';
import { MenuService } from './menu.service';
import { PopupsService } from './popups.service';
import { SiteConfigService } from './site-config.service';
import { CmsController } from './cms.controller';
import { AdminCmsController } from './admin-cms.controller';
import { AdminCmsContentController } from './admin-cms-content.controller';

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
      SiteConfig,
    ]),
    RedisModule,
  ],
  controllers: [CmsController, AdminCmsController, AdminCmsContentController],
  providers: [
    BannersService,
    HomepageService,
    PagesService,
    FaqService,
    MenuService,
    PopupsService,
    SiteConfigService,
  ],
  exports: [SiteConfigService],
})
export class CmsModule {}
