import {
  Controller, Get, Put, Param, ParseIntPipe, Query, Request,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiOkResponse, ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thông báo của tôi' })
  @ApiOkResponse({
    schema: {
      example: {
        items: [
          {
            id: 1, type: 'don_hang.xac_nhan', title: 'Đơn hàng #DH001 đã được xác nhận',
            content: 'Đơn hàng của bạn đang được chuẩn bị.', channel: 'Push',
            isRead: false, createdAt: '2024-06-01T10:00:00.000Z',
          },
        ],
        total: 5, page: 1, limit: 20, unreadCount: 3,
      },
    },
  })
  getMyNotifications(@Request() req, @Query() query: QueryNotificationsDto) {
    return this.notificationsService.getMyNotifications(req.user.id, query);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo là đã đọc' })
  markAllRead(@Request() req) {
    return this.notificationsService.markAllRead(req.user.id);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Đánh dấu thông báo là đã đọc' })
  markRead(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.notificationsService.markRead(id, req.user.id);
  }
}
