import {
  Controller, Get, Post, Put, Patch, Body, Param, ParseIntPipe, Request, Query, Sse,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiOkResponse, ApiResponse,
  ApiBearerAuth, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Roles } from '../../common/decorators/roles.decorator';
import { SupportService } from './support.service';
import { SupportAdminQueryService } from './support-admin-query.service';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { AdminCreateTicketDto } from './dto/admin-create-ticket.dto';
import { UpdateTicketMetaDto } from './dto/update-ticket-meta.dto';

@ApiTags('Admin — Support')
@ApiBearerAuth()
@Controller('admin/tickets')
@Roles('admin', 'staff')
export class AdminSupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly queryService: SupportAdminQueryService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê tổng quan ticket (counts + SLA + avg resolution)' })
  @ApiOkResponse({ description: 'TicketStatsResponseDto' })
  getStats() {
    return this.queryService.getTicketStats();
  }

  @Get('assignee-stats')
  @ApiOperation({ summary: 'Số phiếu đang mở theo nhân viên phụ trách (dùng cho dropdown phân công)' })
  getAssigneeStats() {
    return this.queryService.getAssigneeStats();
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách tất cả ticket (lọc theo trạng thái, mức độ, tìm kiếm)' })
  @ApiQuery({ name: 'status', required: false, enum: ['Moi', 'DangXuLy', 'DaGiaiQuyet', 'DaDong'] })
  @ApiQuery({ name: 'priority', required: false, enum: ['Cao', 'TrungBinh', 'Thap'] })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'myOnly', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'loaiVanDe', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  findAll(@Query() query: QueryTicketsDto, @Request() req: any) {
    const currentEmployeeId: number | undefined = req.user?.employeeId ?? req.user?.sub;
    return this.queryService.findAll(query, currentEmployeeId);
  }

  @Post()
  @ApiOperation({ summary: 'Admin tạo ticket thay khách hàng' })
  @ApiResponse({ status: 201, description: 'Ticket đã được tạo — trả về TicketDetailResponseDto' })
  createTicket(@Body() dto: AdminCreateTicketDto) {
    return this.queryService.adminCreateTicket(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết ticket (bao gồm messages)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 404, description: 'Ticket không tồn tại' })
  getDetail(@Param('id', ParseIntPipe) id: number) {
    return this.queryService.getTicketDetail(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật ưu tiên hoặc nhãn của ticket' })
  @ApiParam({ name: 'id', example: 1 })
  async updateMeta(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTicketMetaDto) {
    await this.supportService.updateTicketMeta(id, dto);
    return this.queryService.getTicketDetail(id);
  }

  @Put(':id/assign')
  @ApiOperation({ summary: 'Phân công nhân viên phụ trách ticket' })
  @ApiParam({ name: 'id', example: 1 })
  async assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignTicketDto) {
    await this.supportService.assignTicket(id, dto);
    return this.queryService.getTicketDetail(id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Nhân viên gửi phản hồi (Reply hoặc InternalNote)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 201, description: 'TicketMessageResponseDto' })
  @ApiResponse({ status: 400, description: 'Ticket đã đóng' })
  sendMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
    @Request() req: any,
  ) {
    const employeeId: number = req.user?.employeeId ?? req.user?.sub;
    return this.supportService.sendStaffMessage(id, dto, employeeId);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Lịch sử tin nhắn ticket (bao gồm InternalNote)' })
  @ApiParam({ name: 'id', example: 1 })
  getMessages(@Param('id', ParseIntPipe) id: number) {
    return this.supportService.getMessages(id);
  }

  @Put(':id/close')
  @ApiOperation({ summary: 'Đóng ticket' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 400, description: 'Ticket đã đóng rồi' })
  async close(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const employeeId: number = req.user?.employeeId ?? req.user?.sub;
    await this.supportService.closeTicket(id, employeeId);
    return this.queryService.getTicketDetail(id);
  }

  @Put(':id/resolve')
  @ApiOperation({ summary: 'Đánh dấu ticket đã giải quyết (DaGiaiQuyet)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 400, description: 'Ticket đã đóng hoặc đã giải quyết' })
  async resolve(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const employeeId: number = req.user?.employeeId ?? req.user?.sub;
    await this.supportService.resolveTicket(id, employeeId);
    return this.queryService.getTicketDetail(id);
  }

  @Put(':id/reopen')
  @ApiOperation({ summary: 'Mở lại ticket đã đóng hoặc đã giải quyết' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 400, description: 'Ticket chưa đóng/giải quyết' })
  async reopen(@Param('id', ParseIntPipe) id: number) {
    await this.supportService.reopenTicket(id);
    return this.queryService.getTicketDetail(id);
  }

  @Sse(':id/stream')
  @ApiOperation({ summary: 'SSE stream — nhận cập nhật real-time của ticket' })
  @ApiParam({ name: 'id', example: 1 })
  stream(@Param('id', ParseIntPipe) id: number): Observable<MessageEvent> {
    return this.supportService
      .getTicketStream(id)
      .pipe(map((payload) => ({ data: JSON.stringify(payload.data) } as MessageEvent)));
  }
}
