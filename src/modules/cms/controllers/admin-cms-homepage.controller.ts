import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param,
  ParseIntPipe, Query, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/permission.decorator';
import { HomepageService } from '../services/homepage.service';
import { HomepagePreviewService } from '../services/homepage-preview.service';
import { CreateHomepageSectionDto } from '../dto/create-homepage-section.dto';
import { UpdateHomepageSectionDto } from '../dto/update-homepage-section.dto';
import { ReorderHomepageSectionsDto } from '../dto/reorder-homepage-sections.dto';

@ApiTags('Admin — CMS')
@ApiBearerAuth('access-token')
@Controller('admin')
export class AdminCmsHomepageController {
  constructor(
    private readonly homepageService: HomepageService,
    private readonly homepagePreviewService: HomepagePreviewService,
  ) {}

  @Get('homepage-sections')
  @RequirePermission('cms.read')
  @ApiOperation({ summary: 'Danh sách homepage sections (admin)' })
  @ApiResponse({ status: 200, description: 'Danh sách sections theo sortOrder' })
  getSections() {
    return this.homepageService.findAll();
  }

  // Static routes BEFORE /:id to avoid NestJS routing conflicts
  @Get('homepage-sections/preview')
  @RequirePermission('cms.read')
  @ApiOperation({ summary: 'Preview sản phẩm cho section config (admin)' })
  @ApiQuery({ name: 'type', required: true, example: 'category' })
  @ApiQuery({ name: 'sourceConfig', required: false, description: 'JSON string of source config' })
  @ApiQuery({ name: 'maxProducts', required: false, example: 8 })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm preview' })
  getPreview(
    @Query('type') type: string,
    @Query('sourceConfig') sourceConfigStr: string,
    @Query('maxProducts') maxProductsStr: string,
  ) {
    const sourceConfig = sourceConfigStr ? JSON.parse(sourceConfigStr) : null;
    const maxProducts = Math.min(Number(maxProductsStr) || 8, 50);
    return this.homepagePreviewService.getPreview(type, sourceConfig, maxProducts);
  }

  @Patch('homepage-sections/reorder')
  @RequirePermission('cms.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cập nhật thứ tự hiển thị sections (bulk reorder)' })
  @ApiResponse({ status: 204, description: 'Thứ tự đã được lưu' })
  reorderSections(@Body() dto: ReorderHomepageSectionsDto) {
    return this.homepageService.reorder(dto.ids);
  }

  @Get('homepage-sections/:id')
  @RequirePermission('cms.read')
  @ApiOperation({ summary: 'Chi tiết homepage section (admin)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 404, description: 'Section không tồn tại' })
  getSection(@Param('id', ParseIntPipe) id: number) {
    return this.homepageService.findOne(id);
  }

  @Post('homepage-sections')
  @RequirePermission('cms.create')
  @ApiOperation({ summary: 'Tạo homepage section mới' })
  @ApiResponse({ status: 201, description: 'Section đã được tạo' })
  createSection(@Body() dto: CreateHomepageSectionDto, @Request() req: any) {
    return this.homepageService.create(dto, req.user.sub);
  }

  @Put('homepage-sections/:id')
  @RequirePermission('cms.update')
  @ApiOperation({ summary: 'Cập nhật homepage section' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 404, description: 'Section không tồn tại' })
  updateSection(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHomepageSectionDto) {
    return this.homepageService.update(id, dto);
  }

  @Delete('homepage-sections/:id')
  @RequirePermission('cms.delete')
  @ApiOperation({ summary: 'Xoá homepage section' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 404, description: 'Section không tồn tại' })
  removeSection(@Param('id', ParseIntPipe) id: number) {
    return this.homepageService.remove(id);
  }

  @Post('homepage-sections/:id/clone')
  @RequirePermission('cms.create')
  @ApiOperation({ summary: 'Nhân bản homepage section (isVisible=false, title + Bản sao)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 201, description: 'Bản sao đã được tạo' })
  @ApiResponse({ status: 404, description: 'Section không tồn tại' })
  cloneSection(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.homepageService.clone(id, req.user.sub);
  }
}
