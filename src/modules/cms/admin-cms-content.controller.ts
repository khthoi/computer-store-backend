import {
  Controller, Get, Post, Put, Delete, Body, Param,
  ParseIntPipe, Query, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Danh sách trang nội dung (admin)' })
  getPages() {
    return this.pagesService.findAll();
  }

  @Get('pages/:id')
  @ApiOperation({ summary: 'Chi tiết trang nội dung (admin)' })
  getPage(@Param('id', ParseIntPipe) id: number) {
    return this.pagesService.findOne(id);
  }

  @Post('pages')
  @ApiOperation({ summary: 'Tạo trang nội dung mới' })
  createPage(@Body() dto: CreatePageDto, @Request() req: any) {
    return this.pagesService.create(dto, req.user.sub);
  }

  @Put('pages/:id')
  @ApiOperation({ summary: 'Cập nhật trang nội dung' })
  updatePage(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePageDto, @Request() req: any) {
    return this.pagesService.update(id, dto, req.user.sub);
  }

  @Delete('pages/:id')
  @ApiOperation({ summary: 'Xoá trang nội dung' })
  removePage(@Param('id', ParseIntPipe) id: number) {
    return this.pagesService.remove(id);
  }

  // ── FAQ Groups ─────────────────────────────────────────────
  @Get('faq/groups')
  @ApiOperation({ summary: 'Danh sách nhóm FAQ (admin)' })
  getFaqGroups() {
    return this.faqService.findAllGroups();
  }

  @Post('faq/groups')
  @ApiOperation({ summary: 'Tạo nhóm FAQ mới' })
  createFaqGroup(@Body() dto: CreateFaqGroupDto) {
    return this.faqService.createGroup(dto);
  }

  @Put('faq/groups/:id')
  @ApiOperation({ summary: 'Cập nhật nhóm FAQ' })
  updateFaqGroup(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFaqGroupDto) {
    return this.faqService.updateGroup(id, dto);
  }

  @Delete('faq/groups/:id')
  @ApiOperation({ summary: 'Xoá nhóm FAQ' })
  removeFaqGroup(@Param('id', ParseIntPipe) id: number) {
    return this.faqService.removeGroup(id);
  }

  // ── FAQ Items ──────────────────────────────────────────────
  @Get('faq/items')
  @ApiOperation({ summary: 'Danh sách FAQ item (admin)' })
  getFaqItems(@Query('groupId') groupId?: string) {
    return this.faqService.findAllItems(groupId ? +groupId : undefined);
  }

  @Post('faq/items')
  @ApiOperation({ summary: 'Tạo FAQ item mới' })
  createFaqItem(@Body() dto: CreateFaqItemDto) {
    return this.faqService.createItem(dto);
  }

  @Put('faq/items/:id')
  @ApiOperation({ summary: 'Cập nhật FAQ item' })
  updateFaqItem(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFaqItemDto) {
    return this.faqService.updateItem(id, dto);
  }

  @Delete('faq/items/:id')
  @ApiOperation({ summary: 'Xoá FAQ item' })
  removeFaqItem(@Param('id', ParseIntPipe) id: number) {
    return this.faqService.removeItem(id);
  }

  // ── Menus ──────────────────────────────────────────────────
  @Get('menus')
  @ApiOperation({ summary: 'Danh sách menu (admin)' })
  getMenus() {
    return this.menuService.getAllMenus();
  }

  @Get('menus/:id')
  @ApiOperation({ summary: 'Chi tiết menu với cây item (admin)' })
  getMenu(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.getMenuItemsByMenu(id);
  }

  @Post('menus/:id/items')
  @ApiOperation({ summary: 'Thêm item vào menu' })
  addMenuItem(@Param('id', ParseIntPipe) menuId: number, @Body() dto: CreateMenuItemDto) {
    return this.menuService.addItem(menuId, dto);
  }

  @Put('menus/:menuId/items/:itemId')
  @ApiOperation({ summary: 'Cập nhật menu item' })
  updateMenuItem(
    @Param('menuId', ParseIntPipe) menuId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.menuService.updateItem(menuId, itemId, dto);
  }

  @Delete('menus/:menuId/items/:itemId')
  @ApiOperation({ summary: 'Xoá menu item' })
  removeMenuItem(
    @Param('menuId', ParseIntPipe) menuId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.menuService.removeItem(menuId, itemId);
  }

  // ── Site Config ────────────────────────────────────────────
  @Get('site-config')
  @ApiOperation({ summary: 'Lấy toàn bộ site config (admin)' })
  getSiteConfig() {
    return this.siteConfigService.findAll();
  }

  @Put('site-config/:key')
  @ApiOperation({ summary: 'Upsert site config theo key' })
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
  removeSiteConfig(@Param('key') key: string) {
    return this.siteConfigService.remove(key);
  }
}
