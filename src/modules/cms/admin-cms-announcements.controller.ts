import {
  Controller, Get, Post, Put, Delete, Body, Param,
  ParseIntPipe, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AnnouncementBarsService } from './announcement-bars.service';
import { CreateAnnouncementBarDto } from './dto/create-announcement-bar.dto';
import { UpdateAnnouncementBarDto } from './dto/update-announcement-bar.dto';

@ApiTags('Admin — CMS')
@ApiBearerAuth('access-token')
@Controller('admin')
@Roles('admin', 'staff')
export class AdminCmsAnnouncementsController {
  constructor(private readonly announcementBarsService: AnnouncementBarsService) {}

  @Get('announcement-bars')
  @ApiOperation({ summary: 'Danh sách thanh thông báo (admin)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  getAnnouncementBars() {
    return this.announcementBarsService.findAll();
  }

  @Get('announcement-bars/:id')
  @ApiOperation({ summary: 'Chi tiết thanh thông báo (admin)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID thanh thông báo' })
  @ApiResponse({ status: 404, description: 'Thanh thông báo không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  getAnnouncementBar(@Param('id', ParseIntPipe) id: number) {
    return this.announcementBarsService.findOne(id);
  }

  @Post('announcement-bars')
  @ApiOperation({ summary: 'Tạo thanh thông báo mới' })
  @ApiResponse({ status: 201, description: 'Thanh thông báo đã được tạo' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Conflict — đã có thanh thông báo active cùng vị trí hoặc lịch trùng' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  createAnnouncementBar(@Body() dto: CreateAnnouncementBarDto, @Request() req: any) {
    return this.announcementBarsService.create(dto, req.user.sub);
  }

  @Put('announcement-bars/:id')
  @ApiOperation({ summary: 'Cập nhật thanh thông báo' })
  @ApiParam({ name: 'id', example: 1, description: 'ID thanh thông báo' })
  @ApiResponse({ status: 200, description: 'Thanh thông báo đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Thanh thông báo không tồn tại' })
  @ApiResponse({ status: 409, description: 'Conflict — đã có thanh thông báo active cùng vị trí hoặc lịch trùng' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  updateAnnouncementBar(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAnnouncementBarDto) {
    return this.announcementBarsService.update(id, dto);
  }

  @Delete('announcement-bars/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá thanh thông báo' })
  @ApiParam({ name: 'id', example: 1, description: 'ID thanh thông báo' })
  @ApiResponse({ status: 204, description: 'Thanh thông báo đã được xoá' })
  @ApiResponse({ status: 404, description: 'Thanh thông báo không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  removeAnnouncementBar(@Param('id', ParseIntPipe) id: number) {
    return this.announcementBarsService.remove(id);
  }
}
