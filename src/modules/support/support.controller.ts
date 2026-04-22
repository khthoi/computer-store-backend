import {
  Controller, Get, Post, Body, Param, ParseIntPipe, Request, Query, Sse,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiOkResponse, ApiResponse,
  ApiBearerAuth, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';

@ApiTags('Support')
@ApiBearerAuth()
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  @ApiOperation({ summary: 'Mở ticket hỗ trợ mới' })
  @ApiResponse({ status: 201, description: 'Ticket đã được tạo' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createTicket(@Body() dto: CreateTicketDto, @Request() req: any) {
    return this.supportService.createTicket(dto, req.user.sub);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Danh sách ticket của tôi' })
  @ApiQuery({ name: 'status', required: false, enum: ['Moi', 'DangXuLy', 'ChoDongY', 'DaDong', 'MoLai'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({
    schema: {
      example: {
        items: [
          {
            id: 1, ticketCode: 'TK-240601-A3B4C5', issueType: 'GiaoHangChamTre',
            priority: 'TrungBinh', title: 'Đơn hàng #20 giao trễ',
            status: 'Moi', createdAt: '2024-06-01T10:00:00.000Z',
          },
        ],
        total: 1, page: 1, limit: 20,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyTickets(@Request() req: any, @Query() query: QueryTicketsDto) {
    return this.supportService.getMyTickets(req.user.sub, query);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Chi tiết ticket của tôi' })
  @ApiParam({ name: 'id', example: 1, description: 'ID ticket' })
  @ApiResponse({ status: 404, description: 'Ticket không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyTicketDetail(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.supportService.getMyTicketDetail(id, req.user.sub);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Gửi tin nhắn cho ticket đang mở' })
  @ApiParam({ name: 'id', example: 1, description: 'ID ticket' })
  @ApiResponse({ status: 201, description: 'Tin nhắn đã được gửi' })
  @ApiResponse({ status: 400, description: 'Ticket đã đóng' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  sendMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
    @Request() req: any,
  ) {
    return this.supportService.sendCustomerMessage(id, dto, req.user.sub);
  }

  @Get('tickets/:id/messages')
  @ApiOperation({ summary: 'Lịch sử tin nhắn ticket (chỉ hiện Reply, ẩn InternalNote)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID ticket' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMessages(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    // Verify ownership before returning messages
    return this.supportService.getMyTicketDetail(id, req.user.sub).then(() =>
      this.supportService.getMessages(id),
    );
  }

  @Sse('tickets/:id/stream')
  @ApiOperation({ summary: 'SSE stream — nhận tin nhắn mới theo thời gian thực' })
  @ApiParam({ name: 'id', example: 1, description: 'ID ticket' })
  stream(@Param('id', ParseIntPipe) id: number): Observable<MessageEvent> {
    return this.supportService
      .getTicketStream(id)
      .pipe(map((payload) => ({ data: JSON.stringify(payload.data) } as MessageEvent)));
  }
}
