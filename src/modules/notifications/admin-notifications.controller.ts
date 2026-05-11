import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  ParseIntPipe, Sse, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiBearerAuth,
  ApiParam, ApiCreatedResponse, ApiNoContentResponse,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { NotificationsService } from './notifications.service';
import { NotificationsAdminService } from './notifications-admin.service';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { QueryAdminNotificationsDto } from './dto/query-admin-notifications.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';

@ApiTags('Admin — Notifications')
@ApiBearerAuth('access-token')
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsAdminService: NotificationsAdminService,
  ) {}

  @Sse('stream')
  @RequirePermission('notifications.read')
  @ApiOperation({ summary: 'SSE stream sự kiện thông báo real-time cho admin' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  stream(): Observable<MessageEvent> {
    return this.notificationsService.getAdminStream().pipe(
      map((payload) => ({ data: JSON.stringify(payload.data) } as MessageEvent)),
    );
  }

  // ─── Notification list & stats ────────────────────────────────────────────

  @Get()
  @RequirePermission('notifications.read')
  @ApiOperation({ summary: 'Danh sách thông báo admin (có filter + phân trang)' })
  @ApiOkResponse({ description: 'Trả về danh sách ThongBaoRow + metadata phân trang' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAdminNotifications(@Query() dto: QueryAdminNotificationsDto) {
    return this.notificationsAdminService.getAdminNotifications(dto);
  }

  @Get('stats')
  @RequirePermission('notifications.read')
  @ApiOperation({ summary: 'KPI thống kê thông báo' })
  @ApiOkResponse({
    schema: {
      example: {
        tongThongBao: 150, chuaGui: 12, daGui: 120,
        thatBai: 8, huyBo: 10, tyLeDaDoc: 67,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStats() {
    return this.notificationsAdminService.getStats();
  }

  @Post('broadcast')
  @RequirePermission('notifications.create')
  @ApiOperation({ summary: 'Tạo thông báo hàng loạt (N khách × M kênh)' })
  @ApiCreatedResponse({ schema: { example: { created: 6 } } })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  broadcastNotification(@Body() dto: BroadcastNotificationDto) {
    return this.notificationsAdminService.broadcastNotification(dto);
  }

  @Patch(':id/cancel')
  @RequirePermission('notifications.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Hủy thông báo (guard: ChuaGui)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiNoContentResponse()
  @ApiResponse({ status: 400, description: 'Chỉ có thể hủy thông báo ở trạng thái ChuaGui' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  cancelNotification(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsAdminService.cancelNotification(id);
  }

  @Patch(':id/retry')
  @RequirePermission('notifications.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Gửi lại thông báo (guard: ThatBai)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiNoContentResponse()
  @ApiResponse({ status: 400, description: 'Chỉ có thể gửi lại thông báo ở trạng thái ThatBai' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  retryNotification(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsAdminService.retryNotification(id);
  }

  // ─── Config CRUD ──────────────────────────────────────────────────────────

  @Get('configs')
  @RequirePermission('notifications.read')
  @ApiOperation({ summary: 'Danh sách cấu hình thông báo tự động' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAllConfigs() {
    return this.notificationsService.findAllConfigs();
  }

  @Get('configs/:id')
  @RequirePermission('notifications.read')
  @ApiOperation({ summary: 'Chi tiết cấu hình thông báo' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 404, description: 'Cấu hình không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOneConfig(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.findOneConfig(id);
  }

  @Post('configs')
  @RequirePermission('notifications.create')
  @ApiOperation({ summary: 'Tạo cấu hình thông báo mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createConfig(@Body() dto: CreateConfigDto, @Request() req) {
    return this.notificationsService.createConfig(dto, req.user.id);
  }

  @Put('configs/:id')
  @RequirePermission('notifications.update')
  @ApiOperation({ summary: 'Cập nhật cấu hình thông báo' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 404, description: 'Cấu hình không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConfigDto,
    @Request() req,
  ) {
    return this.notificationsService.updateConfig(id, dto, req.user.id);
  }

  @Delete('configs/:id')
  @RequirePermission('notifications.delete')
  @ApiOperation({ summary: 'Xóa cấu hình thông báo' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 404, description: 'Cấu hình không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  deleteConfig(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.deleteConfig(id);
  }
}
