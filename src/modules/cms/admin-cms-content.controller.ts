import {
  Controller, Get, Post, Put, Delete, Body, Param,
  ParseIntPipe, Query, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { PagesService } from './pages.service';
import { FaqService } from './faq.service';
import { MenuService } from './menu.service';
import { SiteConfigService } from './site-config.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { CreateFaqGroupDto } from './dto/create-faq-group.dto';
import { UpdateFaqGroupDto } from './dto/update-faq-group.dto';
import { CreateFaqItemDto } from './dto/create-faq-item.dto';
import { UpdateFaqItemDto } from './dto/update-faq-item.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { UpsertSiteConfigDto } from './dto/upsert-site-config.dto';

@ApiTags('Admin — CMS')
@ApiBearerAuth('access-token')
@Controller('admin')
@Roles('admin', 'staff')
export class AdminCmsContentController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly faqService: FaqService,
    private readonly menuService: MenuService,
    private readonly siteConfigService: SiteConfigService,
  ) {}

  // ── Pages ──────────────────────────────────────────────────
  @Get('pages')
  @ApiOperation({ summary: 'Danh sách trang nội dung (admin, bao gồm bản nháp)' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, title: 'Chính sách bảo hành', slug: 'chinh-sach-bao-hanh', status: 'Published', publishedAt: '2024-01-01T00:00:00.000Z' },
        { id: 2, title: 'Về chúng tôi', slug: 've-chung-toi', status: 'Draft', publishedAt: null },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  getPages() {
    return this.pagesService.findAll();
  }

  @Get('pages/:id')
  @ApiOperation({ summary: 'Chi tiết trang nội dung (admin)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID trang nội dung' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 1,
        title: 'Chính sách bảo hành',
        slug: 'chinh-sach-bao-hanh',
        content: '<p>Nội dung chính sách bảo hành...</p>',
        status: 'Published',
        publishedAt: '2024-01-01T00:00:00.000Z',
        createdAt: '2023-12-01T08:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Trang nội dung không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  getPage(@Param('id', ParseIntPipe) id: number) {
    return this.pagesService.findOne(id);
  }

  @Post('pages')
  @ApiOperation({ summary: 'Tạo trang nội dung mới' })
  @ApiResponse({ status: 201, description: 'Trang nội dung đã được tạo' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  createPage(@Body() dto: CreatePageDto, @Request() req: any) {
    return this.pagesService.create(dto, req.user.sub);
  }

  @Put('pages/:id')
  @ApiOperation({ summary: 'Cập nhật trang nội dung' })
  @ApiParam({ name: 'id', example: 1, description: 'ID trang nội dung' })
  @ApiResponse({ status: 200, description: 'Trang nội dung đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Trang nội dung không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  updatePage(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePageDto, @Request() req: any) {
    return this.pagesService.update(id, dto, req.user.sub);
  }

  @Delete('pages/:id')
  @ApiOperation({ summary: 'Xoá trang nội dung' })
  @ApiParam({ name: 'id', example: 1, description: 'ID trang nội dung' })
  @ApiResponse({ status: 200, description: 'Trang nội dung đã được xoá' })
  @ApiResponse({ status: 404, description: 'Trang nội dung không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  removePage(@Param('id', ParseIntPipe) id: number) {
    return this.pagesService.remove(id);
  }

  // ── FAQ Groups ─────────────────────────────────────────────
  @Get('faq/groups')
  @ApiOperation({ summary: 'Danh sách nhóm FAQ (admin)' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, title: 'Vận chuyển & Giao hàng', sortOrder: 1 },
        { id: 2, title: 'Thanh toán', sortOrder: 2 },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  getFaqGroups() {
    return this.faqService.findAllGroups();
  }

  @Post('faq/groups')
  @ApiOperation({ summary: 'Tạo nhóm FAQ mới' })
  @ApiResponse({ status: 201, description: 'Nhóm FAQ đã được tạo' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  createFaqGroup(@Body() dto: CreateFaqGroupDto) {
    return this.faqService.createGroup(dto);
  }

  @Put('faq/groups/:id')
  @ApiOperation({ summary: 'Cập nhật nhóm FAQ' })
  @ApiParam({ name: 'id', example: 1, description: 'ID nhóm FAQ' })
  @ApiResponse({ status: 200, description: 'Nhóm FAQ đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Nhóm FAQ không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  updateFaqGroup(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFaqGroupDto) {
    return this.faqService.updateGroup(id, dto);
  }

  @Delete('faq/groups/:id')
  @ApiOperation({ summary: 'Xoá nhóm FAQ' })
  @ApiParam({ name: 'id', example: 1, description: 'ID nhóm FAQ' })
  @ApiResponse({ status: 200, description: 'Nhóm FAQ đã được xoá' })
  @ApiResponse({ status: 404, description: 'Nhóm FAQ không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  removeFaqGroup(@Param('id', ParseIntPipe) id: number) {
    return this.faqService.removeGroup(id);
  }

  // ── FAQ Items ──────────────────────────────────────────────
  @Get('faq/items')
  @ApiOperation({ summary: 'Danh sách FAQ item (admin, lọc theo nhóm)' })
  @ApiQuery({ name: 'groupId', required: false, description: 'Lọc theo ID nhóm FAQ', example: 1 })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, groupId: 1, question: 'Bao lâu để nhận được hàng?', answer: '3-5 ngày làm việc', sortOrder: 1, helpfulCount: 12, isActive: true },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  getFaqItems(@Query('groupId') groupId?: string) {
    return this.faqService.findAllItems(groupId ? +groupId : undefined);
  }

  @Post('faq/items')
  @ApiOperation({ summary: 'Tạo FAQ item mới' })
  @ApiResponse({ status: 201, description: 'FAQ item đã được tạo' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  createFaqItem(@Body() dto: CreateFaqItemDto) {
    return this.faqService.createItem(dto);
  }

  @Put('faq/items/:id')
  @ApiOperation({ summary: 'Cập nhật FAQ item' })
  @ApiParam({ name: 'id', example: 1, description: 'ID FAQ item' })
  @ApiResponse({ status: 200, description: 'FAQ item đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'FAQ item không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  updateFaqItem(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFaqItemDto) {
    return this.faqService.updateItem(id, dto);
  }

  @Delete('faq/items/:id')
  @ApiOperation({ summary: 'Xoá FAQ item' })
  @ApiParam({ name: 'id', example: 1, description: 'ID FAQ item' })
  @ApiResponse({ status: 200, description: 'FAQ item đã được xoá' })
  @ApiResponse({ status: 404, description: 'FAQ item không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  removeFaqItem(@Param('id', ParseIntPipe) id: number) {
    return this.faqService.removeItem(id);
  }

  // ── Menus ──────────────────────────────────────────────────
  @Get('menus')
  @ApiOperation({ summary: 'Danh sách menu (admin)' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, position: 'header', name: 'Menu chính' },
        { id: 2, position: 'footer', name: 'Menu chân trang' },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  getMenus() {
    return this.menuService.getAllMenus();
  }

  @Get('menus/:id')
  @ApiOperation({ summary: 'Chi tiết menu với cây item (admin)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID menu' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 1,
        position: 'header',
        name: 'Menu chính',
        items: [
          { id: 1, label: 'Laptop', url: '/laptops', sortOrder: 1, parentId: null },
          { id: 2, label: 'Laptop Gaming', url: '/laptops/gaming', sortOrder: 1, parentId: 1 },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Menu không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  getMenu(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.getMenuItemsByMenu(id);
  }

  @Post('menus/:id/items')
  @ApiOperation({ summary: 'Thêm item vào menu' })
  @ApiParam({ name: 'id', example: 1, description: 'ID menu' })
  @ApiResponse({ status: 201, description: 'Menu item đã được thêm' })
  @ApiResponse({ status: 404, description: 'Menu không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  addMenuItem(@Param('id', ParseIntPipe) menuId: number, @Body() dto: CreateMenuItemDto) {
    return this.menuService.addItem(menuId, dto);
  }

  @Put('menus/:menuId/items/:itemId')
  @ApiOperation({ summary: 'Cập nhật menu item' })
  @ApiParam({ name: 'menuId', example: 1, description: 'ID menu' })
  @ApiParam({ name: 'itemId', example: 1, description: 'ID menu item' })
  @ApiResponse({ status: 200, description: 'Menu item đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Menu hoặc item không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  updateMenuItem(
    @Param('menuId', ParseIntPipe) menuId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.menuService.updateItem(menuId, itemId, dto);
  }

  @Delete('menus/:menuId/items/:itemId')
  @ApiOperation({ summary: 'Xoá menu item' })
  @ApiParam({ name: 'menuId', example: 1, description: 'ID menu' })
  @ApiParam({ name: 'itemId', example: 1, description: 'ID menu item' })
  @ApiResponse({ status: 200, description: 'Menu item đã được xoá' })
  @ApiResponse({ status: 404, description: 'Menu hoặc item không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  removeMenuItem(
    @Param('menuId', ParseIntPipe) menuId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.menuService.removeItem(menuId, itemId);
  }

  // ── Site Config ────────────────────────────────────────────
  @Get('site-config')
  @ApiOperation({ summary: 'Lấy toàn bộ site config (admin)' })
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  getSiteConfig() {
    return this.siteConfigService.findAll();
  }

  @Put('site-config/:key')
  @ApiOperation({ summary: 'Upsert site config theo key' })
  @ApiParam({ name: 'key', example: 'store_name', description: 'Tên key cấu hình' })
  @ApiResponse({ status: 200, description: 'Cấu hình đã được cập nhật' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  upsertSiteConfig(
    @Param('key') key: string,
    @Body() dto: UpsertSiteConfigDto,
    @Request() req: any,
  ) {
    return this.siteConfigService.upsert(key, dto, req.user.sub);
  }

  @Delete('site-config/:key')
  @Roles('admin')
  @ApiOperation({ summary: 'Xoá site config key (chỉ admin)' })
  @ApiParam({ name: 'key', example: 'store_name', description: 'Tên key cấu hình cần xoá' })
  @ApiResponse({ status: 200, description: 'Cấu hình đã được xoá' })
  @ApiResponse({ status: 404, description: 'Key cấu hình không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — chỉ admin được xoá cấu hình' })
  removeSiteConfig(@Param('key') key: string) {
    return this.siteConfigService.remove(key);
  }
}
