import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param,
  ParseIntPipe, Query, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { BannersService } from './banners.service';
import { PopupsService } from './popups.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { QueryBannersDto } from './dto/query-banners.dto';
import { UpdateBannersLayoutDto } from './dto/update-banners-layout.dto';
import { ReorderBannersDto } from './dto/reorder-banners.dto';
import { CreatePopupDto } from './dto/create-popup.dto';
import { UpdatePopupDto } from './dto/update-popup.dto';

@ApiTags('Admin — CMS')
@ApiBearerAuth('access-token')
@Controller('admin')
export class AdminCmsController {
  constructor(
    private readonly bannersService: BannersService,
    private readonly popupsService: PopupsService,
  ) {}

  // ── Banners ──────────────────────────────────────────────
  @Get('banners')
  @RequirePermission('cms.read')
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
  @RequirePermission('cms.read')
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
  @RequirePermission('cms.create')
  @ApiOperation({ summary: 'Tạo banner mới' })
  @ApiResponse({ status: 201, description: 'Banner đã được tạo' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  createBanner(@Body() dto: CreateBannerDto, @Request() req: any) {
    return this.bannersService.create(dto, req.user.sub);
  }

  @Put('banners/:id')
  @RequirePermission('cms.update')
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
  @RequirePermission('cms.delete')
  @ApiOperation({ summary: 'Xoá banner' })
  @ApiParam({ name: 'id', example: 1, description: 'ID banner' })
  @ApiResponse({ status: 200, description: 'Banner đã được xoá' })
  @ApiResponse({ status: 404, description: 'Banner không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  removeBanner(@Param('id', ParseIntPipe) id: number) {
    return this.bannersService.remove(id);
  }

  @Patch('banners/reorder')
  @RequirePermission('cms.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cập nhật sortOrder của banners theo vị trí (bulk reorder)' })
  @ApiResponse({ status: 204, description: 'Thứ tự đã được lưu' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  reorderBanners(@Body() dto: ReorderBannersDto) {
    return this.bannersService.reorder(dto);
  }

  @Patch('banners/layout')
  @RequirePermission('cms.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cập nhật vị trí grid của promotions_banner (bulk)' })
  @ApiResponse({ status: 204, description: 'Layout đã được lưu' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  updateBannersLayout(@Body() dto: UpdateBannersLayoutDto) {
    return this.bannersService.updateLayout(dto);
  }

  // ── Popups ────────────────────────────────────────────────
  @Get('popups')
  @RequirePermission('cms.read')
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
  @RequirePermission('cms.read')
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
  @RequirePermission('cms.create')
  @ApiOperation({ summary: 'Tạo popup mới' })
  @ApiResponse({ status: 201, description: 'Popup đã được tạo' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  createPopup(@Body() dto: CreatePopupDto, @Request() req: any) {
    return this.popupsService.create(dto, req.user.sub);
  }

  @Put('popups/:id')
  @RequirePermission('cms.update')
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
  @RequirePermission('cms.delete')
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
