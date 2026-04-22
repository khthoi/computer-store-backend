import {
  Controller, Get, Post, Put, Body, Param, ParseIntPipe, Request, Query, Sse,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiOkResponse, ApiResponse,
  ApiBearerAuth, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Roles } from '../../common/decorators/roles.decorator';
import { SupportService } from './support.service';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Admin — Support')
@ApiBearerAuth()
@Controller('admin/tickets')
@Roles('admin', 'staff')
export class AdminSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách tất cả ticket (lọc theo trạng thái, mức độ)' })
  @ApiQuery({ name: 'status', required: false, enum: ['Moi', 'DangXuLy', 'ChoDongY', 'DaDong', 'MoLai'] })
  @ApiQuery({ name: 'priority', required: false, enum: ['Cao', 'TrungBinh', 'Thap'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({
    schema: {
      example: {
        items: [
          {
            id: 1, ticketCode: 'TK-240601-A3B4C5', customerId: 3,
            issueType: 'GiaoHangChamTre', priority: 'Cao',
            title: 'Đơn hàng giao trễ 5 ngày', status: 'Moi',
            assignedToId: null, slaDeadline: '2024-06-01T14:00:00.000Z',
            createdAt: '2024-06-01T10:00:00.000Z',
          },
        ],
        total: 1, page: 1, limit: 20,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAll(@Query() query: QueryTicketsDto) {
    return this.supportService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết ticket' })
  @ApiParam({ name: 'id', example: 1, description: 'ID ticket' })
  @ApiResponse({ status: 404, description: 'Ticket không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getDetail(@Param('id', ParseIntPipe) id: number) {
    return this.supportService.getTicketDetail(id);
  }

  @Put(':id/assign')
  @ApiOperation({ summary: 'Phân công nhân viên phụ trách ticket' })
  @ApiParam({ name: 'id', example: 1, description: 'ID ticket' })
  @ApiResponse({ status: 200, description: 'Đã phân công nhân viên' })
  @ApiResponse({ status: 404, description: 'Ticket không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignTicketDto) {
    return this.supportService.assignTicket(id, dto);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Nhân viên gửi phản hồi cho ticket (Reply hoặc InternalNote)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID ticket' })
  @ApiResponse({ status: 201, description: 'Tin nhắn đã được gửi' })
  @ApiResponse({ status: 400, description: 'Ticket đã đóng' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  sendMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
    @Request() req: any,
  ) {
    const employeeId = req.user?.employeeId ?? req.user?.sub;
    return this.supportService.sendStaffMessage(id, dto, employeeId);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Lịch sử toàn bộ tin nhắn ticket (bao gồm InternalNote)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID ticket' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1, ticketId: 1, senderType: 'KhachHang', senderId: 3,
          content: 'Đơn hàng của tôi bị chậm', messageType: 'Reply',
          createdAt: '2024-06-01T10:00:00.000Z',
        },
        {
          id: 2, ticketId: 1, senderType: 'NhanVien', senderId: 2,
          content: 'Ghi chú nội bộ: chờ vận chuyển xác nhận', messageType: 'InternalNote',
          createdAt: '2024-06-01T10:30:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  getMessages(@Param('id', ParseIntPipe) id: number) {
    return this.supportService.getMessages(id);
  }

  @Put(':id/close')
  @ApiOperation({ summary: 'Đóng ticket' })
  @ApiParam({ name: 'id', example: 1, description: 'ID ticket' })
  @ApiResponse({ status: 200, description: 'Ticket đã được đóng' })
  @ApiResponse({ status: 400, description: 'Ticket đã đóng rồi' })
  @ApiResponse({ status: 404, description: 'Ticket không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  close(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const employeeId = req.user?.employeeId ?? req.user?.sub;
    return this.supportService.closeTicket(id, employeeId);
  }

  @Put(':id/reopen')
  @ApiOperation({ summary: 'Mở lại ticket đã đóng — tăng so_lan_mo_lai' })
  @ApiParam({ name: 'id', example: 1, description: 'ID ticket' })
  @ApiResponse({ status: 200, description: 'Ticket đã được mở lại' })
  @ApiResponse({ status: 400, description: 'Ticket chưa đóng' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  reopen(@Param('id', ParseIntPipe) id: number) {
    return this.supportService.reopenTicket(id);
  }

  @Sse(':id/stream')
  @ApiOperation({ summary: 'SSE stream — nhận cập nhật real-time của ticket (dành cho admin)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID ticket' })
  stream(@Param('id', ParseIntPipe) id: number): Observable<MessageEvent> {
    return this.supportService
      .getTicketStream(id)
      .pipe(map((payload) => ({ data: JSON.stringify(payload.data) } as MessageEvent)));
  }
}
