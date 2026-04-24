import { Controller, Get, Param, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiParam } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Lấy danh sách banner theo vị trí mặc định (TrangChu)' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          position: 'TrangChu',
          title: 'Siêu sale mùa hè',
          imageUrl: 'https://res.cloudinary.com/pc-store/image/upload/banners/b1.jpg',
          linkUrl: '/sale',
          sortOrder: 1,
          isActive: true,
        },
      ],
    },
  })
  getBannersByPosition(@Param() _: never) {
    return this.bannersService.findPublic('TrangChu');
  }

  @Get('banners/:position')
  @ApiOperation({ summary: 'Lấy banner theo vị trí cụ thể' })
  @ApiParam({ name: 'position', example: 'TrangChu', description: 'Vị trí hiển thị banner' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          position: 'TrangChu',
          title: 'Siêu sale mùa hè',
          imageUrl: 'https://res.cloudinary.com/pc-store/image/upload/banners/b1.jpg',
          linkUrl: '/sale',
          sortOrder: 1,
          isActive: true,
        },
      ],
    },
  })
  getBanners(@Param('position') position: string) {
    return this.bannersService.findPublic(position);
  }

  @Get('homepage-sections')
  @ApiOperation({ summary: 'Lấy các section trang chủ đang hiển thị' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, sectionKey: 'featured_products', title: 'Sản phẩm nổi bật', sortOrder: 1, isVisible: true },
        { id: 2, sectionKey: 'flash_sale', title: 'Flash Sale', sortOrder: 2, isVisible: true },
      ],
    },
  })
  getHomepageSections() {
    return this.homepageService.findAllPublic();
  }

  @Get('pages')
  @ApiOperation({ summary: 'Danh sách trang nội dung đã xuất bản' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, title: 'Chính sách bảo hành', slug: 'chinh-sach-bao-hanh', status: 'Published' },
        { id: 2, title: 'Chính sách đổi trả', slug: 'chinh-sach-doi-tra', status: 'Published' },
      ],
    },
  })
  getPages() {
    return this.pagesService.findAllPublic();
  }

  @Get('pages/:slug')
  @ApiOperation({ summary: 'Chi tiết trang nội dung theo slug' })
  @ApiParam({ name: 'slug', example: 'chinh-sach-bao-hanh', description: 'Slug của trang nội dung' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 1,
        title: 'Chính sách bảo hành',
        slug: 'chinh-sach-bao-hanh',
        content: '<p>Nội dung chính sách bảo hành...</p>',
        status: 'Published',
        publishedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Trang nội dung không tồn tại' })
  getPageBySlug(@Param('slug') slug: string) {
    return this.pagesService.findBySlugPublic(slug);
  }

  @Get('faq')
  @ApiOperation({ summary: 'Danh sách FAQ theo nhóm' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          title: 'Vận chuyển & Giao hàng',
          sortOrder: 1,
          items: [
            { id: 1, question: 'Bao lâu để nhận được hàng?', answer: '3-5 ngày làm việc', helpfulCount: 12 },
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
  @ApiOperation({ summary: 'Đánh dấu FAQ hữu ích (+1)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID của FAQ item' })
  markHelpful(@Param('id') id: string) {
    return this.faqService.incrementHelpful(+id);
  }

  @Get('menus/:position')
  @ApiOperation({ summary: 'Lấy cây menu theo vị trí' })
  @ApiParam({ name: 'position', example: 'header', description: 'Vị trí menu (header, footer, v.v.)' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          label: 'Laptop',
          url: '/laptops',
          sortOrder: 1,
          children: [
            { id: 2, label: 'Laptop Gaming', url: '/laptops/gaming', sortOrder: 1, children: [] },
          ],
        },
      ],
    },
  })
  getMenu(@Param('position') position: string) {
    return this.menuService.getMenuByPosition(position);
  }

  @Get('popups')
  @ApiOperation({ summary: 'Popup đang hoạt động' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          title: 'Ưu đãi hôm nay',
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
  @ApiOperation({ summary: 'Lấy toàn bộ site config (key-value)' })
  @ApiOkResponse({
    schema: {
      example: {
        store_name: 'PC Store',
        store_phone: '0901234567',
        store_email: 'info@pcstore.vn',
        store_address: '123 Nguyễn Văn A, Q.1, TP.HCM',
      },
    },
  })
  getSiteConfig() {
    return this.siteConfigService.findAll();
  }
}
