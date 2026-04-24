import {
  Controller, Get, Post, Put, Delete, Body, Param,
  ParseIntPipe, Query, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { BannersService } from './banners.service';
import { HomepageService } from './homepage.service';
import { PopupsService } from './popups.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { QueryBannersDto } from './dto/query-banners.dto';
import { CreateHomepageSectionDto } from './dto/create-homepage-section.dto';
import { UpdateHomepageSectionDto } from './dto/update-homepage-section.dto';
import { CreatePopupDto } from './dto/create-popup.dto';
import { UpdatePopupDto } from './dto/update-popup.dto';

@ApiTags('Admin — CMS')
@ApiBearerAuth('access-token')
@Controller('admin')
@Roles('admin', 'staff')
export class AdminCmsController {
  constructor(
    private readonly bannersService: BannersService,
    private readonly homepageService: HomepageService,
    private readonly popupsService: PopupsService,
  ) {}

  // ── Banners ──────────────────────────────────────────────
  @Get('banners')
  @ApiOperation({ summary: 'Danh sách banner (admin, hỗ trợ lọc theo vị trí và trạng thái)' })
  @ApiQuery({ name: 'position', required: false, description: 'Lọc theo vị trí banner', example: 'TrangChu' })
  @ApiQuery({ name: 'status', required: false, description: 'Lọc theo trạng thái', example: 'DangHienThi' })
  @ApiQuery({ name: 'page', required: false, description: 'Trang', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Số item/trang', example: 20 })
  @ApiOkResponse({
    schema: {
      example: {
        items: [
          {
            id: 1,
            position: 'TrangChu',
            title: 'Siêu sale mùa hè',
            imageUrl: 'https://res.cloudinary.com/pc-store/image/upload/banners/b1.jpg',
            linkUrl: '/sale',
            sortOrder: 1,
            isActive: true,
            startDate: '2024-06-01T00:00:00.000Z',
            endDate: '2024-09-01T23:59:59.000Z',
          },
        ],
        total: 8,
        page: 1,
        limit: 20,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  getBanners(@Query() query: QueryBannersDto) {
    return this.bannersService.findAll(query);
  }

  @Get('banners/:id')
  @ApiOperation({ summary: 'Chi tiết banner (admin)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID banner' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 1,
        position: 'TrangChu',
        title: 'Siêu sale mùa hè',
        imageUrl: 'https://res.cloudinary.com/pc-store/image/upload/banners/b1.jpg',
        linkUrl: '/sale',
        sortOrder: 1,
        isActive: true,
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-09-01T23:59:59.000Z',
        createdAt: '2024-05-20T08:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Banner không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  getBanner(@Param('id', ParseIntPipe) id: number) {
    return this.bannersService.findOne(id);
  }

  @Post('banners')
  @ApiOperation({ summary: 'Tạo banner mới' })
  @ApiResponse({ status: 201, description: 'Banner đã được tạo' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  createBanner(@Body() dto: CreateBannerDto, @Request() req: any) {
    return this.bannersService.create(dto, req.user.sub);
  }

  @Put('banners/:id')
  @ApiOperation({ summary: 'Cập nhật banner' })
  @ApiParam({ name: 'id', example: 1, description: 'ID banner' })
  @ApiResponse({ status: 200, description: 'Banner đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Banner không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  updateBanner(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBannerDto,
    @Request() req: any,
  ) {
    return this.bannersService.update(id, dto, req.user.sub);
  }

  @Delete('banners/:id')
  @ApiOperation({ summary: 'Xoá banner' })
  @ApiParam({ name: 'id', example: 1, description: 'ID banner' })
  @ApiResponse({ status: 200, description: 'Banner đã được xoá' })
  @ApiResponse({ status: 404, description: 'Banner không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  removeBanner(@Param('id', ParseIntPipe) id: number) {
    return this.bannersService.remove(id);
  }

  // ── Homepage sections ─────────────────────────────────────
  @Get('homepage-sections')
  @ApiOperation({ summary: 'Danh sách homepage sections (admin)' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, sectionKey: 'featured_products', title: 'Sản phẩm nổi bật', sortOrder: 1, isVisible: true },
        { id: 2, sectionKey: 'flash_sale', title: 'Flash Sale', sortOrder: 2, isVisible: false },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  getSections() {
    return this.homepageService.findAll();
  }

  @Get('homepage-sections/:id')
  @ApiOperation({ summary: 'Chi tiết homepage section (admin)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID homepage section' })
  @ApiOkResponse({
    schema: {
      example: { id: 1, sectionKey: 'featured_products', title: 'Sản phẩm nổi bật', sortOrder: 1, isVisible: true, createdAt: '2024-01-01T00:00:00.000Z' },
    },
  })
  @ApiResponse({ status: 404, description: 'Section không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  getSection(@Param('id', ParseIntPipe) id: number) {
    return this.homepageService.findOne(id);
  }

  @Post('homepage-sections')
  @ApiOperation({ summary: 'Tạo homepage section mới' })
  @ApiResponse({ status: 201, description: 'Section đã được tạo' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  createSection(@Body() dto: CreateHomepageSectionDto, @Request() req: any) {
    return this.homepageService.create(dto, req.user.sub);
  }

  @Put('homepage-sections/:id')
  @ApiOperation({ summary: 'Cập nhật homepage section' })
  @ApiParam({ name: 'id', example: 1, description: 'ID homepage section' })
  @ApiResponse({ status: 200, description: 'Section đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Section không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  updateSection(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHomepageSectionDto) {
    return this.homepageService.update(id, dto);
  }

  @Delete('homepage-sections/:id')
  @ApiOperation({ summary: 'Xoá homepage section' })
  @ApiParam({ name: 'id', example: 1, description: 'ID homepage section' })
  @ApiResponse({ status: 200, description: 'Section đã được xoá' })
  @ApiResponse({ status: 404, description: 'Section không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  removeSection(@Param('id', ParseIntPipe) id: number) {
    return this.homepageService.remove(id);
  }

  // ── Popups ────────────────────────────────────────────────
  @Get('popups')
  @ApiOperation({ summary: 'Danh sách popup (admin)' })
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
          startDate: '2024-06-01T00:00:00.000Z',
          endDate: '2024-06-30T23:59:59.000Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  getPopups() {
    return this.popupsService.findAll();
  }

  @Get('popups/:id')
  @ApiOperation({ summary: 'Chi tiết popup (admin)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID popup' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 1,
        title: 'Ưu đãi hôm nay',
        imageUrl: 'https://res.cloudinary.com/pc-store/image/upload/popups/p1.jpg',
        linkUrl: '/sale',
        displayDelay: 3,
        isActive: true,
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-06-30T23:59:59.000Z',
        createdAt: '2024-05-25T08:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Popup không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  getPopup(@Param('id', ParseIntPipe) id: number) {
    return this.popupsService.findOne(id);
  }

  @Post('popups')
  @ApiOperation({ summary: 'Tạo popup mới' })
  @ApiResponse({ status: 201, description: 'Popup đã được tạo' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  createPopup(@Body() dto: CreatePopupDto, @Request() req: any) {
    return this.popupsService.create(dto, req.user.sub);
  }

  @Put('popups/:id')
  @ApiOperation({ summary: 'Cập nhật popup' })
  @ApiParam({ name: 'id', example: 1, description: 'ID popup' })
  @ApiResponse({ status: 200, description: 'Popup đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Popup không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  updatePopup(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePopupDto) {
    return this.popupsService.update(id, dto);
  }

  @Delete('popups/:id')
  @ApiOperation({ summary: 'Xoá popup' })
  @ApiParam({ name: 'id', example: 1, description: 'ID popup' })
  @ApiResponse({ status: 200, description: 'Popup đã được xoá' })
  @ApiResponse({ status: 404, description: 'Popup không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  removePopup(@Param('id', ParseIntPipe) id: number) {
    return this.popupsService.remove(id);
  }
}
