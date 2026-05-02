import {
  Controller, Get, Put, Post, Patch, Body, Param, ParseIntPipe, Request, Query,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiOkResponse, ApiResponse,
  ApiBearerAuth, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReturnsService } from './returns.service';
import { QueryReturnsDto } from './dto/query-returns.dto';
import { ProcessReturnDto } from './dto/process-return.dto';
import {
  ProcessRefundResolutionDto,
  ProcessExchangeResolutionDto,
  ProcessWarrantyReturnDto,
  UpdateWarrantyStatusDto,
} from './dto/process-resolution.dto';

@ApiTags('Admin — Returns')
@ApiBearerAuth()
@Controller('admin/returns')
@Roles('admin', 'staff')
export class AdminReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách tất cả yêu cầu đổi/trả (có lọc theo trạng thái)' })
  @ApiQuery({ name: 'status', required: false, enum: ['ChoDuyet', 'DaDuyet', 'TuChoi', 'DangXuLy', 'HoanThanh'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({
    schema: {
      example: {
        items: [
          {
            id: 1, orderId: 15, customerId: 3, requestType: 'TraHang',
            reason: 'HangLoiKhongDungMoTa', status: 'ChoDuyet',
            processedById: null, inspectionResult: null, resolution: null,
            createdAt: '2024-06-05T08:00:00.000Z',
          },
        ],
        total: 1, page: 1, limit: 20,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAll(@Query() query: QueryReturnsDto) {
    return this.returnsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết yêu cầu đổi/trả (kèm items, resolution record, ảnh bằng chứng)' })
  @ApiParam({ name: 'id', example: 1, description: 'ID yêu cầu đổi/trả' })
  @ApiOkResponse({ description: 'Chi tiết yêu cầu đổi/trả' })
  @ApiResponse({ status: 404, description: 'Yêu cầu không tồn tại' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.returnsService.findOne(id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Duyệt / từ chối / cập nhật trạng thái yêu cầu đổi/trả' })
  @ApiParam({ name: 'id', example: 1, description: 'ID yêu cầu đổi/trả' })
  @ApiResponse({ status: 200, description: 'Trạng thái đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Yêu cầu không tồn tại' })
  processReturn(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProcessReturnDto,
    @Request() req: any,
  ) {
    const employeeId = req.user?.employeeId ?? req.user?.sub;
    return this.returnsService.processReturn(id, dto, employeeId);
  }

  @Get(':id/assets')
  @ApiOperation({ summary: 'Danh sách ảnh bằng chứng của yêu cầu đổi/trả' })
  @ApiParam({ name: 'id', example: 1, description: 'ID yêu cầu đổi/trả' })
  @ApiOkResponse({
    schema: {
      example: [{ id: 1, returnRequestId: 1, assetId: 12, sortOrder: 0 }],
    },
  })
  getAssets(@Param('id', ParseIntPipe) id: number) {
    return this.returnsService.getReturnAssets(id);
  }

  // ─── Xử lý hoàn tiền ──────────────────────────────────────────────────────

  @Post(':id/process-refund')
  @ApiOperation({ summary: 'Thực hiện hoàn tiền — chạy trong DB transaction đầy đủ' })
  @ApiParam({ name: 'id', example: 1, description: 'ID yêu cầu đổi/trả' })
  @ApiResponse({ status: 201, description: 'Hoàn tiền thành công' })
  @ApiResponse({ status: 400, description: 'Trạng thái yêu cầu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Yêu cầu không tồn tại' })
  processRefund(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProcessRefundResolutionDto,
    @CurrentUser('sub') employeeId: number,
  ) {
    return this.returnsService.processRefund(id, dto, employeeId);
  }

  // ─── Xử lý đổi hàng ───────────────────────────────────────────────────────

  @Post(':id/process-exchange')
  @ApiOperation({ summary: 'Xuất hàng thay thế — tạo đơn hàng đổi mới và trừ tồn kho' })
  @ApiParam({ name: 'id', example: 1, description: 'ID yêu cầu đổi/trả' })
  @ApiResponse({ status: 201, description: 'Đơn đổi hàng đã được tạo' })
  processExchange(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProcessExchangeResolutionDto,
    @CurrentUser('sub') employeeId: number,
  ) {
    return this.returnsService.processExchange(id, dto, employeeId);
  }

  @Patch('resolutions/:resolutionId/confirm-delivered')
  @ApiOperation({ summary: 'Xác nhận khách đã nhận được hàng đổi — hoàn tất quy trình đổi hàng' })
  @ApiParam({ name: 'resolutionId', example: 1 })
  confirmExchangeDelivered(
    @Param('resolutionId', ParseIntPipe) resolutionId: number,
    @CurrentUser('sub') employeeId: number,
  ) {
    return this.returnsService.confirmExchangeDelivered(resolutionId, employeeId);
  }

  // ─── Xử lý bảo hành ───────────────────────────────────────────────────────

  @Post(':id/init-warranty')
  @ApiOperation({ summary: 'Khởi tạo bản ghi bảo hành khi nhận hàng từ khách' })
  @ApiParam({ name: 'id', example: 1, description: 'ID yêu cầu đổi/trả' })
  initWarranty(
    @Param('id', ParseIntPipe) id: number,
    @Body('phieuNhapKhoId') phieuNhapKhoId: number | null,
    @CurrentUser('sub') employeeId: number,
  ) {
    return this.returnsService.initWarrantyResolution(id, phieuNhapKhoId ?? null, employeeId);
  }

  @Patch('resolutions/:resolutionId/warranty-status')
  @ApiOperation({ summary: 'Cập nhật trạng thái bảo hành (mã hãng, ngày gửi/nhận, kết quả)' })
  @ApiParam({ name: 'resolutionId', example: 1 })
  updateWarrantyStatus(
    @Param('resolutionId', ParseIntPipe) resolutionId: number,
    @Body() dto: UpdateWarrantyStatusDto,
  ) {
    return this.returnsService.updateWarrantyStatus(resolutionId, dto);
  }

  @Post(':id/process-warranty')
  @ApiOperation({ summary: 'Trả hàng bảo hành lại khách — trừ tồn kho và hoàn tất quy trình' })
  @ApiParam({ name: 'id', example: 1, description: 'ID yêu cầu đổi/trả' })
  processWarranty(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProcessWarrantyReturnDto,
    @CurrentUser('sub') employeeId: number,
  ) {
    return this.returnsService.processWarranty(id, dto, employeeId);
  }
}
