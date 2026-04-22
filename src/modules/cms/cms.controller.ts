import { Controller, Get, Param, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { BannersService } from './banners.service';
import { HomepageService } from './homepage.service';
import { PagesService } from './pages.service';
import { FaqService } from './faq.service';
import { MenuService } from './menu.service';
import { PopupsService } from './popups.service';
import { SiteConfigService } from './site-config.service';

@ApiTags('CMS')
@Public()
@Controller()
export class CmsController {
  constructor(
    private readonly bannersService: BannersService,
    private readonly homepageService: HomepageService,
    private readonly pagesService: PagesService,
    private readonly faqService: FaqService,
    private readonly menuService: MenuService,
    private readonly popupsService: PopupsService,
    private readonly siteConfigService: SiteConfigService,
  ) {}

  @Get('banners')
  @ApiOperation({ summary: 'Lấy danh sách banner theo vị trí' })
  getBannersByPosition(@Param() _: never) {
    return this.bannersService.findPublic('TrangChu');
  }

  @Get('banners/:position')
  @ApiOperation({ summary: 'Lấy banner theo vị trí cụ thể' })
  getBanners(@Param('position') position: string) {
    return this.bannersService.findPublic(position);
  }

  @Get('homepage-sections')
  @ApiOperation({ summary: 'Lấy các section trang chủ đang hiển thị' })
  getHomepageSections() {
    return this.homepageService.findAllPublic();
  }

  @Get('pages')
  @ApiOperation({ summary: 'Danh sách trang nội dung đã xuất bản' })
  getPages() {
    return this.pagesService.findAllPublic();
  }

  @Get('pages/:slug')
  @ApiOperation({ summary: 'Chi tiết trang nội dung theo slug' })
  getPageBySlug(@Param('slug') slug: string) {
    return this.pagesService.findBySlugPublic(slug);
  }

  @Get('faq')
  @ApiOperation({ summary: 'Danh sách FAQ theo nhóm' })
  getFaq() {
    return this.faqService.findAllPublic();
  }

  @Post('faq/items/:id/helpful')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Đánh dấu FAQ hữu ích (+1)' })
  markHelpful(@Param('id') id: string) {
    return this.faqService.incrementHelpful(+id);
  }

  @Get('menus/:position')
  @ApiOperation({ summary: 'Lấy cây menu theo vị trí' })
  getMenu(@Param('position') position: string) {
    return this.menuService.getMenuByPosition(position);
  }

  @Get('popups')
  @ApiOperation({ summary: 'Popup đang hoạt động' })
  getActivePopups() {
    return this.popupsService.findActive();
  }

  @Get('site-config')
  @ApiOperation({ summary: 'Lấy toàn bộ site config (key-value)' })
  getSiteConfig() {
    return this.siteConfigService.findAll();
  }
}
