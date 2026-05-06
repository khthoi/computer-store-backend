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
import { ProcessReturnDto, UpdateInspectionDto, RejectAfterInspectionDto } from './dto/process-return.dto';
import {
  ProcessRefundResolutionDto,
  ProcessExchangeResolutionDto,
  ProcessWarrantyReturnDto,
  UpdateWarrantyStatusDto,
  UpdateDefectiveHandlingDto,
  CompleteReuseDto,
  ChangeResolutionDto,
} from './dto/process-resolution.dto';
import { ConfirmGoodsReceivedDto } from './dto/confirm-received.dto';

@ApiTags('Admin — Returns')
@ApiBearerAuth()
@Controller('admin/returns')
@Roles('admin', 'staff')
export class AdminReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách tất cả yêu cầu đổi/trả (có lọc theo trạng thái)' })
  @ApiQuery({ name: 'status', required: false, enum: ['ChoDuyet', 'DaDuyet', 'TuChoi', 'DaNhanHang', 'DaKiemTra', 'DangXuLy', 'HoanThanh'] })
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

  // ─── Xác nhận nhận hàng về từ khách ──────────────────────────────────────

  @Patch(':id/confirm-received')
  @ApiOperation({
    summary: 'Xác nhận kho đã nhận hàng khách gửi về — chuyển sang DaNhanHang',
    description: 'Ghi nhận tracking khách gửi, ngày nhận hàng, nhân viên xác nhận. Chỉ dùng cho DoiHang/TraHang/BaoHanh khi hàng thực sự về đến kho.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'ID yêu cầu đổi/trả' })
  @ApiResponse({ status: 200, description: 'Đã xác nhận nhận hàng, trạng thái chuyển sang DaNhanHang' })
  @ApiResponse({ status: 400, description: 'Trạng thái không hợp lệ để xác nhận nhận hàng' })
  @ApiResponse({ status: 404, description: 'Yêu cầu không tồn tại' })
  confirmGoodsReceived(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmGoodsReceivedDto,
    @CurrentUser('sub') employeeId: number,
  ) {
    return this.returnsService.confirmGoodsReceived(id, dto, employeeId);
  }

  // ─── Cập nhật kết quả kiểm tra ───────────────────────────────────────────

  @Patch(':id/inspection')
  @ApiOperation({
    summary: 'Ghi / cập nhật kết quả kiểm tra hàng',
    description: 'Chỉ áp dụng khi yêu cầu ở trạng thái DaNhanHang hoặc DangXuLy.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Đã lưu kết quả kiểm tra' })
  @ApiResponse({ status: 400, description: 'Trạng thái không hợp lệ' })
  updateInspection(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInspectionDto,
    @CurrentUser('sub') employeeId: number,
  ) {
    return this.returnsService.updateInspectionResult(id, dto.inspectionResult, employeeId);
  }

  // ─── Xác nhận hoàn tất kiểm tra ─────────────────────────────────────────

  @Post(':id/complete-inspection')
  @ApiOperation({
    summary: 'Xác nhận hoàn tất kiểm tra — chuyển sang DaKiemTra',
    description: 'Yêu cầu phải có kết quả kiểm tra + ít nhất 1 ảnh bằng chứng inspection_evidence.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 201, description: 'Đã xác nhận, trạng thái chuyển sang DaKiemTra' })
  @ApiResponse({ status: 400, description: 'Thiếu kết quả kiểm tra hoặc ảnh bằng chứng' })
  completeInspection(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('sub') employeeId: number,
  ) {
    return this.returnsService.completeInspection(id, employeeId);
  }

  // ─── Từ chối nhận hàng sau kiểm tra ──────────────────────────────────────

  @Patch(':id/reject-after-inspection')
  @ApiOperation({
    summary: 'Từ chối nhận hàng sau kiểm tra — chuyển sang TuChoiNhanHang',
    description: 'Áp dụng khi hàng kiểm tra không đúng mô tả. Ghi nhận thông tin vận chuyển trả lại cho khách.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'ID yêu cầu đổi/trả' })
  @ApiResponse({ status: 200, description: 'Đã từ chối nhận hàng, trạng thái chuyển sang TuChoiNhanHang' })
  @ApiResponse({ status: 400, description: 'Trạng thái không hợp lệ (phải là DaKiemTra)' })
  rejectAfterInspection(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectAfterInspectionDto,
    @CurrentUser('sub') employeeId: number,
  ) {
    return this.returnsService.rejectAfterInspection(id, dto, employeeId);
  }

  // ─── Thêm ảnh bằng chứng ─────────────────────────────────────────────────

  @Post(':id/assets')
  @ApiOperation({ summary: 'Thêm ảnh bằng chứng (customer_evidence hoặc inspection_evidence) vào yêu cầu đổi/trả' })
  @ApiParam({ name: 'id', example: 1, description: 'ID yêu cầu đổi/trả' })
  @ApiResponse({ status: 201, description: 'Đã thêm ảnh, trả về danh sách ảnh cập nhật' })
  addAsset(
    @Param('id', ParseIntPipe) id: number,
    @Body('assetId') assetId: number,
    @Body('loaiAsset') loaiAsset: 'customer_evidence' | 'inspection_evidence' = 'customer_evidence',
  ) {
    return this.returnsService.addReturnAsset(id, assetId, loaiAsset);
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

  // ─── Đổi hướng xử lý (trước khi process) ────────────────────────────────

  @Patch(':id/change-resolution')
  @ApiOperation({
    summary: 'Đổi hướng xử lý (GiaoHangMoi ↔ HoanTien) khi chưa bắt đầu xử lý',
    description: 'Chỉ áp dụng khi trạng thái là DaDuyet, DaNhanHang hoặc DaKiemTra. Dùng khi hết hàng đổi, chuyển sang hoàn tiền.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'ID yêu cầu đổi/trả' })
  @ApiResponse({ status: 200, description: 'Hướng xử lý đã được cập nhật' })
  @ApiResponse({ status: 400, description: 'Trạng thái không cho phép đổi hướng, hoặc hướng không hợp lệ cho loại yêu cầu' })
  @ApiResponse({ status: 404, description: 'Yêu cầu không tồn tại' })
  changeResolution(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeResolutionDto,
    @CurrentUser('sub') employeeId: number,
  ) {
    return this.returnsService.changeResolution(id, dto, employeeId);
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

  // ─── Ghi nhận xử lý hàng lỗi/hoàn trả ───────────────────────────────────

  @Patch('resolutions/:resolutionId/defective-handling')
  @ApiOperation({
    summary: 'Ghi nhận hướng xử lý hàng lỗi sau khi resolution hoàn thành',
    description: 'Xác định số phận của hàng lỗi đã nhận về: trả nhà cung cấp, tiêu hủy, hoặc tái sử dụng linh kiện.',
  })
  @ApiParam({ name: 'resolutionId', example: 1 })
  @ApiResponse({ status: 200, description: 'Đã ghi nhận xử lý hàng lỗi' })
  @ApiResponse({ status: 400, description: 'Resolution chưa hoàn thành' })
  @ApiResponse({ status: 404, description: 'Resolution không tồn tại' })
  updateDefectiveHandling(
    @Param('resolutionId', ParseIntPipe) resolutionId: number,
    @Body() dto: UpdateDefectiveHandlingDto,
    @CurrentUser('sub') employeeId: number,
  ) {
    return this.returnsService.updateDefectiveHandling(resolutionId, dto, employeeId);
  }

  @Patch('resolutions/:resolutionId/complete-reuse')
  @ApiOperation({
    summary: 'Hoàn tất tái sử dụng hàng lỗi — gán phiếu nhập kho cho hàng đã sửa xong',
    description: 'Chỉ dùng sau khi đã gọi defective-handling với TaiSuDung và hàng đã được sửa chữa, tạo phiếu nhập kho (NhapHoanTra) và duyệt trong inventory module.',
  })
  @ApiParam({ name: 'resolutionId', example: 1 })
  @ApiResponse({ status: 200, description: 'Phiếu nhập đã được gán, hàng sửa xong vào kho', schema: { example: { resolutionId: 1, phieuNhapKhoId: 7, status: 'completed' } } })
  @ApiResponse({ status: 400, description: 'Không phải TaiSuDung, phiếu nhập không hợp lệ, hoặc đã được gán rồi' })
  @ApiResponse({ status: 404, description: 'Resolution không tồn tại' })
  completeDefectiveReuse(
    @Param('resolutionId', ParseIntPipe) resolutionId: number,
    @Body() dto: CompleteReuseDto,
    @CurrentUser('sub') employeeId: number,
  ) {
    return this.returnsService.completeDefectiveReuse(resolutionId, dto, employeeId);
  }
}
