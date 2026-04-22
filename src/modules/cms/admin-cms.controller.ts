import {
  Controller, Get, Post, Put, Delete, Body, Param,
  ParseIntPipe, Query, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Danh sách banner (admin)' })
  getBanners(@Query() query: QueryBannersDto) {
    return this.bannersService.findAll(query);
  }

  @Get('banners/:id')
  @ApiOperation({ summary: 'Chi tiết banner (admin)' })
  getBanner(@Param('id', ParseIntPipe) id: number) {
    return this.bannersService.findOne(id);
  }

  @Post('banners')
  @ApiOperation({ summary: 'Tạo banner mới' })
  createBanner(@Body() dto: CreateBannerDto, @Request() req: any) {
    return this.bannersService.create(dto, req.user.sub);
  }

  @Put('banners/:id')
  @ApiOperation({ summary: 'Cập nhật banner' })
  updateBanner(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBannerDto,
    @Request() req: any,
  ) {
    return this.bannersService.update(id, dto, req.user.sub);
  }

  @Delete('banners/:id')
  @ApiOperation({ summary: 'Xoá banner' })
  removeBanner(@Param('id', ParseIntPipe) id: number) {
    return this.bannersService.remove(id);
  }

  // ── Homepage sections ─────────────────────────────────────
  @Get('homepage-sections')
  @ApiOperation({ summary: 'Danh sách homepage sections (admin)' })
  getSections() {
    return this.homepageService.findAll();
  }

  @Get('homepage-sections/:id')
  @ApiOperation({ summary: 'Chi tiết homepage section (admin)' })
  getSection(@Param('id', ParseIntPipe) id: number) {
    return this.homepageService.findOne(id);
  }

  @Post('homepage-sections')
  @ApiOperation({ summary: 'Tạo homepage section mới' })
  createSection(@Body() dto: CreateHomepageSectionDto, @Request() req: any) {
    return this.homepageService.create(dto, req.user.sub);
  }

  @Put('homepage-sections/:id')
  @ApiOperation({ summary: 'Cập nhật homepage section' })
  updateSection(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHomepageSectionDto) {
    return this.homepageService.update(id, dto);
  }

  @Delete('homepage-sections/:id')
  @ApiOperation({ summary: 'Xoá homepage section' })
  removeSection(@Param('id', ParseIntPipe) id: number) {
    return this.homepageService.remove(id);
  }

  // ── Popups ────────────────────────────────────────────────
  @Get('popups')
  @ApiOperation({ summary: 'Danh sách popup (admin)' })
  getPopups() {
    return this.popupsService.findAll();
  }

  @Get('popups/:id')
  @ApiOperation({ summary: 'Chi tiết popup (admin)' })
  getPopup(@Param('id', ParseIntPipe) id: number) {
    return this.popupsService.findOne(id);
  }

  @Post('popups')
  @ApiOperation({ summary: 'Tạo popup mới' })
  createPopup(@Body() dto: CreatePopupDto, @Request() req: any) {
    return this.popupsService.create(dto, req.user.sub);
  }

  @Put('popups/:id')
  @ApiOperation({ summary: 'Cập nhật popup' })
  updatePopup(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePopupDto) {
    return this.popupsService.update(id, dto);
  }

  @Delete('popups/:id')
  @ApiOperation({ summary: 'Xoá popup' })
  removePopup(@Param('id', ParseIntPipe) id: number) {
    return this.popupsService.remove(id);
  }
}
