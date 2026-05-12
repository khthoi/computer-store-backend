import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { BANNER_POSITIONS } from '../dto/create-banner.dto';
import { PublicBannerQueryDto } from '../dto/public-banner-query.dto';
import {
  PublicCategoryShortcutDto,
  PublicHomepageContentDto,
  PublicTrustBadgeDto,
} from '../dto/public-content.dto';
import { BannersService } from '../services/banners.service';
import { FaqService } from '../services/faq.service';
import { HomepageService } from '../services/homepage.service';
import { MenuService } from '../services/menu.service';
import { PagesService } from '../services/pages.service';
import { PopupsService } from '../services/popups.service';
import { SiteConfigService } from '../services/site-config.service';

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
  @ApiOperation({ summary: 'Lay danh sach banner public theo mot hoac nhieu position' })
  @ApiQuery({
    name: 'position',
    required: true,
    isArray: true,
    enum: BANNER_POSITIONS,
    example: ['homepage_hero', 'homepage_small'],
  })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: '12',
          title: 'Khuyen mai thang 3',
          position: 'homepage_hero',
          status: 'active',
          imageUrl: 'https://cdn.example.com/hero.jpg',
          mobileImageUrl: null,
          linkUrl: '/promotions',
          linkTarget: '_self',
          altText: 'Khuyen mai thang 3',
          overlayText: null,
          overlaySubtext: null,
          ctaLabel: null,
          ctaUrl: null,
          badge: null,
          badgeColor: null,
          badgeTextColor: null,
          gridX: null,
          gridY: null,
          gridW: null,
          gridH: null,
          sortOrder: 1,
          startDate: null,
          endDate: null,
        },
      ],
    },
  })
  getBannersByPosition(@Query() query: PublicBannerQueryDto) {
    return this.bannersService.findPublicMany(query.position);
  }

  @Get('banners/:position')
  @ApiOperation({ summary: 'Lay banner public theo mot position cu the' })
  @ApiParam({
    name: 'position',
    example: 'homepage_hero',
    enum: BANNER_POSITIONS,
    description: 'Vi tri hien thi banner',
  })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: '12',
          title: 'Khuyen mai thang 3',
          position: 'homepage_hero',
          status: 'active',
          imageUrl: 'https://cdn.example.com/hero.jpg',
          mobileImageUrl: null,
          linkUrl: '/promotions',
          linkTarget: '_self',
          altText: 'Khuyen mai thang 3',
          overlayText: null,
          overlaySubtext: null,
          ctaLabel: null,
          ctaUrl: null,
          badge: null,
          badgeColor: null,
          badgeTextColor: null,
          gridX: null,
          gridY: null,
          gridW: null,
          gridH: null,
          sortOrder: 1,
          startDate: null,
          endDate: null,
        },
      ],
    },
  })
  getBanners(@Param('position') position: string) {
    if (!BANNER_POSITIONS.includes(position as (typeof BANNER_POSITIONS)[number])) {
      throw new BadRequestException(`Invalid banner position: ${position}`);
    }

    return this.bannersService.findPublic(position);
  }

  @Get('content/trust-badges')
  @ApiOperation({ summary: 'Lay trust badges dang active cho homepage' })
  @ApiOkResponse({
    type: PublicTrustBadgeDto,
    isArray: true,
    schema: {
      example: [
        {
          id: 'tb-1',
          icon: 'TruckIcon',
          title: 'Mien phi giao hang',
          subtitle: 'Don tu 500.000d',
          sortOrder: 1,
        },
      ],
    },
  })
  getTrustBadges() {
    return this.siteConfigService.getTrustBadges();
  }

  @Get('content/category-shortcuts')
  @ApiOperation({ summary: 'Lay category shortcuts dang active cho homepage' })
  @ApiOkResponse({
    type: PublicCategoryShortcutDto,
    isArray: true,
    schema: {
      example: [
        {
          id: 'cs-1',
          emoji: '💻',
          iconUrl: null,
          label: 'Laptop',
          url: '/products/laptop',
          sortOrder: 1,
        },
      ],
    },
  })
  getCategoryShortcuts() {
    return this.siteConfigService.getCategoryShortcuts();
  }

  @Get('content/homepage')
  @ApiOperation({ summary: 'Lay homepage content public cho storefront' })
  @ApiOkResponse({
    type: PublicHomepageContentDto,
    schema: {
      example: {
        banners: {
          hero: [],
          heroSlider: [],
          smallPromo: [],
        },
        trustBadges: [],
        categoryShortcuts: [],
      },
    },
  })
  async getHomepageContent(): Promise<PublicHomepageContentDto> {
    const [banners, trustBadges, categoryShortcuts] = await Promise.all([
      this.bannersService.findPublicMany([
        'homepage_hero',
        'homepage_hero_slider',
        'homepage_small',
      ]),
      this.siteConfigService.getTrustBadges(),
      this.siteConfigService.getCategoryShortcuts(),
    ]);

    return {
      banners: {
        hero: banners.filter((item) => item.position === 'homepage_hero'),
        heroSlider: banners.filter((item) => item.position === 'homepage_hero_slider'),
        smallPromo: banners.filter((item) => item.position === 'homepage_small'),
      },
      trustBadges,
      categoryShortcuts,
    };
  }

  @Get('content/homepage-hero-mode')
  @ApiOperation({ summary: 'Che do hien thi hero o trang chu: banner | slider' })
  @ApiOkResponse({ schema: { example: { mode: 'banner' } } })
  async getHomepageHeroMode() {
    return { mode: await this.siteConfigService.getHomepageHeroMode() };
  }

  @Get('homepage-sections')
  @ApiOperation({ summary: 'Lay cac section trang chu dang hien thi' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, sectionKey: 'featured_products', title: 'San pham noi bat', sortOrder: 1, isVisible: true },
        { id: 2, sectionKey: 'flash_sale', title: 'Flash Sale', sortOrder: 2, isVisible: true },
      ],
    },
  })
  getHomepageSections() {
    return this.homepageService.findAllPublic();
  }

  @Get('pages')
  @ApiOperation({ summary: 'Danh sach trang noi dung da xuat ban' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, title: 'Chinh sach bao hanh', slug: 'chinh-sach-bao-hanh', status: 'Published' },
        { id: 2, title: 'Chinh sach doi tra', slug: 'chinh-sach-doi-tra', status: 'Published' },
      ],
    },
  })
  getPages() {
    return this.pagesService.findAllPublic();
  }

  @Get('pages/:slug')
  @ApiOperation({ summary: 'Chi tiet trang noi dung theo slug' })
  @ApiParam({
    name: 'slug',
    example: 'chinh-sach-bao-hanh',
    description: 'Slug cua trang noi dung',
  })
  @ApiOkResponse({
    schema: {
      example: {
        id: 1,
        title: 'Chinh sach bao hanh',
        slug: 'chinh-sach-bao-hanh',
        content: '<p>Noi dung chinh sach bao hanh...</p>',
        status: 'Published',
        publishedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Trang noi dung khong ton tai' })
  getPageBySlug(@Param('slug') slug: string) {
    return this.pagesService.findBySlugPublic(slug);
  }

  @Get('faq')
  @ApiOperation({ summary: 'Danh sach FAQ theo nhom' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          title: 'Van chuyen va Giao hang',
          sortOrder: 1,
          items: [
            {
              id: 1,
              question: 'Bao lau de nhan duoc hang?',
              answer: '3-5 ngay lam viec',
              helpfulCount: 12,
            },
          ],
        },
      ],
    },
  })
  getFaq() {
    return this.faqService.findAllPublic();
  }

  @Post('faq/items/:id/helpful')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Danh dau FAQ huu ich (+1)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID cua FAQ item' })
  markHelpful(@Param('id') id: string) {
    return this.faqService.incrementHelpful(+id);
  }

  @Get('menus/:position')
  @ApiOperation({ summary: 'Lay cay menu theo vi tri' })
  @ApiParam({
    name: 'position',
    example: 'header',
    description: 'Vi tri menu (header, footer, v.v.)',
  })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          label: 'Laptop',
          url: '/laptops',
          sortOrder: 1,
          children: [
            {
              id: 2,
              label: 'Laptop Gaming',
              url: '/laptops/gaming',
              sortOrder: 1,
              children: [],
            },
          ],
        },
      ],
    },
  })
  getMenu(@Param('position') position: string) {
    return this.menuService.getMenuByPosition(position);
  }

  @Get('popups')
  @ApiOperation({ summary: 'Popup dang hoat dong' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          title: 'Uu dai hom nay',
          imageUrl: 'https://res.cloudinary.com/pc-store/image/upload/popups/p1.jpg',
          linkUrl: '/sale',
          displayDelay: 3,
          isActive: true,
        },
      ],
    },
  })
  getActivePopups() {
    return this.popupsService.findActive();
  }

  @Get('site-config')
  @ApiOperation({ summary: 'Lay toan bo site config (key-value)' })
  @ApiOkResponse({
    schema: {
      example: {
        store_name: 'PC Store',
        store_phone: '0901234567',
        store_email: 'info@pcstore.vn',
        store_address: '123 Nguyen Van A, Q.1, TP.HCM',
      },
    },
  })
  getSiteConfig() {
    return this.siteConfigService.findAll();
  }
}
