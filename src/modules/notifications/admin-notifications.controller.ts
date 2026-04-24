import {
  Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, Sse, Request,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiBearerAuth, ApiParam,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Roles } from '../../common/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';

@ApiTags('Admin — Notifications')
@ApiBearerAuth('access-token')
@Controller('admin/notifications')
@Roles('admin', 'staff')
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('stream')
  @ApiOperation({ summary: 'SSE stream sự kiện thông báo real-time cho admin' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  stream(): Observable<MessageEvent> {
    return this.notificationsService.getAdminStream().pipe(
      map((payload) => ({ data: JSON.stringify(payload.data) } as MessageEvent)),
    );
  }

  // ─── Config CRUD ──────────────────────────────────────────────────────────

  @Get('configs')
  @ApiOperation({ summary: 'Danh sách cấu hình thông báo tự động' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1, triggerKey: 'don_hang.xac_nhan', displayName: 'Xác nhận đơn hàng',
          channels: ['Push', 'Email'], isActive: true,
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAllConfigs() {
    return this.notificationsService.findAllConfigs();
  }

  @Get('configs/:id')
  @ApiOperation({ summary: 'Chi tiết cấu hình thông báo' })
  @ApiParam({ name: 'id', example: 1, description: 'ID cấu hình thông báo' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 1,
        triggerKey: 'don_hang.xac_nhan',
        displayName: 'Xác nhận đơn hàng',
        channels: ['Push', 'Email'],
        templateTitle: 'Đơn hàng #{{orderId}} đã được xác nhận',
        templateBody: 'Cảm ơn bạn đã đặt hàng. Đơn hàng của bạn đang được xử lý.',
        isActive: true,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Cấu hình thông báo không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findOneConfig(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.findOneConfig(id);
  }

  @Post('configs')
  @ApiOperation({ summary: 'Tạo cấu hình thông báo mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  createConfig(@Body() dto: CreateConfigDto, @Request() req) {
    return this.notificationsService.createConfig(dto, req.user.id);
  }

  @Put('configs/:id')
  @ApiOperation({ summary: 'Cập nhật cấu hình thông báo' })
  @ApiParam({ name: 'id', example: 1, description: 'ID cấu hình thông báo' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Cấu hình thông báo không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  updateConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConfigDto,
    @Request() req,
  ) {
    return this.notificationsService.updateConfig(id, dto, req.user.id);
  }

  @Delete('configs/:id')
  @ApiOperation({ summary: 'Xóa cấu hình thông báo' })
  @ApiParam({ name: 'id', example: 1, description: 'ID cấu hình thông báo' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Cấu hình thông báo không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  deleteConfig(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.deleteConfig(id);
  }
}
