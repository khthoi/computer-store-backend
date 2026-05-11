import {
  Controller, Get, Post, Put, Patch, Param, Body, ParseIntPipe, Query, Request,
} from '@nestjs/common';
import { CreateExportReceiptDto } from '../dto/create-export-receipt.dto';
import { QueryExportReceiptDto } from '../dto/query-export-receipt.dto';
import { InventoryExportsService } from '../services/inventory-exports.service';
import { UpdateThresholdsDto, StockBatchResponseDto } from '../dto/inventory-item-response.dto';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery, ApiResponse,
} from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/permission.decorator';
import { InventoryService } from '../services/inventory.service';
import { InventoryImportsService } from '../services/inventory-imports.service';
import { InventoryHistoryService } from '../services/inventory-history.service';
import { InventoryKpiService } from '../services/inventory-kpi.service';
import { BatchService } from '../services/batch.service';
import { QueryStockDto } from '../dto/query-stock.dto';
import { QueryHistoryDto } from '../dto/query-history.dto';
import { AdjustStockDto } from '../dto/adjust-stock.dto';
import { CreateImportReceiptDto } from '../dto/create-import-receipt.dto';
import { ApproveImportDto } from '../dto/approve-import.dto';
import { ImportReceiptSummaryDto, ImportReceiptDetailDto } from '../dto/import-receipt-response.dto';
import { QueryImportReceiptDto } from '../dto/query-import-receipt.dto';
import { QueryMovementsDto } from '../dto/query-movements.dto';

@ApiTags('Admin — Inventory')
@ApiBearerAuth()
@Controller('admin/inventory')
export class AdminInventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly importsService: InventoryImportsService,
    private readonly exportsService: InventoryExportsService,
    private readonly historyService: InventoryHistoryService,
    private readonly kpiService: InventoryKpiService,
    private readonly batchService: BatchService,
  ) {}

  // ─── Stock Levels ────────────────────────────────────────────────────────────

  @Get()
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: '[Admin] Xem mức tồn kho (có filter, sort, phân trang)' })
  findStockLevels(@Query() query: QueryStockDto) {
    return this.inventoryService.findStockLevels(query);
  }

  @Get('summary')
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: 'Thống kê tổng quan tồn kho (stats bar)' })
  getInventorySummary() {
    return this.inventoryService.getInventorySummary();
  }

  @Patch(':variantId/thresholds')
  @RequirePermission('inventory.update')
  @ApiOperation({ summary: 'Cập nhật ngưỡng cảnh báo và điểm đặt hàng lại' })
  @ApiParam({ name: 'variantId', example: 20 })
  updateThresholds(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: UpdateThresholdsDto,
  ) {
    return this.inventoryService.updateThresholds(variantId, dto);
  }

  @Get(':variantId/stock-level')
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: 'Mức tồn kho hiện tại của một phiên bản sản phẩm' })
  @ApiParam({ name: 'variantId', example: 20 })
  findStockLevel(@Param('variantId', ParseIntPipe) variantId: number) {
    return this.inventoryService.findStockLevelByVariant(variantId);
  }

  @Get(':variantId/history')
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: '[Admin] Lịch sử tồn kho có phân trang và lọc' })
  @ApiParam({ name: 'variantId', example: 20 })
  findHistory(@Param('variantId', ParseIntPipe) variantId: number, @Query() query: QueryHistoryDto) {
    return this.inventoryService.findHistoryByVariant(variantId, query);
  }

  @Post('adjust')
  @RequirePermission('inventory.create')
  @ApiOperation({ summary: 'Điều chỉnh tồn kho thủ công' })
  adjustStock(@Body() dto: AdjustStockDto, @Request() req: any) {
    return this.inventoryService.adjustStock(dto, req.user?.employeeId ?? req.user?.sub);
  }

  // ─── Export Receipts ─────────────────────────────────────────────────────────

  @Post('export')
  @RequirePermission('inventory.create')
  @ApiOperation({ summary: '[Admin] Tạo phiếu xuất kho' })
  createExport(@Body() dto: CreateExportReceiptDto, @Request() req: any) {
    return this.exportsService.create(dto, req.user?.employeeId ?? req.user?.sub);
  }

  @Get('export')
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: '[Admin] Danh sách phiếu xuất kho' })
  findExports(@Query() query: QueryExportReceiptDto) {
    return this.exportsService.findAll(query);
  }

  @Get('export/:id')
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: '[Admin] Chi tiết phiếu xuất kho' })
  findOneExport(@Param('id', ParseIntPipe) id: number) {
    return this.exportsService.findOne(id);
  }

  // ─── Stock Movements ──────────────────────────────────────────────────────────

  @Get('movements')
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: 'Lịch sử biến động tồn kho (có phân trang, filter, sort, search)' })
  findMovements(@Query() query: QueryMovementsDto) {
    return this.historyService.findMovements(query);
  }

  // ─── Import Receipts ─────────────────────────────────────────────────────────

  @Get('import')
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: 'Danh sách phiếu nhập kho (có filter, sort, phân trang)' })
  findAllImports(@Query() query: QueryImportReceiptDto) {
    return this.importsService.findAll(query);
  }

  @Get('import/next-code')
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: 'Preview mã phiếu nhập tiếp theo (không commit DB)' })
  async getNextReceiptCode(): Promise<{ code: string }> {
    const code = await this.importsService.generateNextReceiptCode();
    return { code };
  }

  @Get('import/:id')
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: 'Chi tiết phiếu nhập kho' })
  @ApiResponse({ status: 200, type: ImportReceiptDetailDto })
  findOneImport(@Param('id', ParseIntPipe) id: number): Promise<ImportReceiptDetailDto> {
    return this.importsService.findOne(id);
  }

  @Post('import')
  @RequirePermission('inventory.create')
  @ApiOperation({ summary: 'Tạo phiếu nhập kho mới' })
  createImport(@Body() dto: CreateImportReceiptDto, @Request() req: any) {
    return this.importsService.create(dto, req.user?.employeeId ?? req.user?.sub);
  }

  @Put('import/:id/approve')
  @RequirePermission('inventory.update')
  @ApiOperation({ summary: 'Duyệt phiếu nhập kho' })
  approveImport(@Param('id', ParseIntPipe) id: number, @Body() dto: ApproveImportDto, @Request() req: any) {
    return this.importsService.approve(id, req.user?.employeeId ?? req.user?.sub, dto);
  }

  @Put('import/:id/complete')
  @RequirePermission('inventory.update')
  @ApiOperation({ summary: 'Hoàn tất phiếu nhập một phần (partial → received)' })
  completeImport(@Param('id', ParseIntPipe) id: number) {
    return this.importsService.complete(id);
  }

  @Put('import/:id/reject')
  @RequirePermission('inventory.update')
  @ApiOperation({ summary: 'Từ chối phiếu nhập kho' })
  rejectImport(@Param('id', ParseIntPipe) id: number) {
    return this.importsService.reject(id);
  }

  @Put('import/:id/resolve')
  @RequirePermission('inventory.update')
  @ApiOperation({ summary: 'Giải quyết phiếu tiếp nhận một phần — tạo phiếu bổ sung' })
  @ApiResponse({ status: 200, type: ImportReceiptDetailDto, description: 'Phiếu bổ sung vừa được tạo' })
  resolveImport(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<ImportReceiptDetailDto> {
    return this.importsService.resolve(id, req.user?.employeeId ?? req.user?.sub);
  }

  // ─── Batches ──────────────────────────────────────────────────────────────────

  @Get(':variantId/batches')
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: 'Danh sách lô hàng của một SKU (FIFO)' })
  @ApiParam({ name: 'variantId', example: 20 })
  @ApiResponse({ status: 200, type: [StockBatchResponseDto] })
  getBatches(@Param('variantId', ParseIntPipe) variantId: number): Promise<StockBatchResponseDto[]> {
    return this.batchService.getBatchesByVariant(variantId);
  }

  // ─── KPI Dashboard ───────────────────────────────────────────────────────────

  @Get('kpi/dashboard')
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: 'KPI tổng hợp: dead stock, turnover, pending import, top moving, fill metrics' })
  getKpiDashboard(@Query('thresholdDays') thresholdDays?: string, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.kpiService.getDashboard({ thresholdDays: thresholdDays ? Number(thresholdDays) : undefined, startDate, endDate });
  }

  @Get('kpi/dead-stock')
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: 'Hàng tồn quá N ngày (dead stock)' })
  @ApiQuery({ name: 'threshold', required: false, example: 90 })
  getDeadStock(@Query('threshold') threshold?: string) {
    return this.kpiService.getDeadStock(threshold ? Number(threshold) : 90);
  }

  @Get('kpi/turnover')
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: 'Vòng quay tồn kho' })
  getTurnover(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.kpiService.getTurnoverRate(startDate, endDate);
  }

  @Get('kpi/pending-import-value')
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: 'Giá trị hàng đang chờ nhập' })
  getPendingImportValue() {
    return this.kpiService.getPendingImportValue();
  }

  @Get('kpi/top-moving')
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: 'Top SKU xuất nhiều nhất' })
  getTopMoving(@Query('days') days?: string, @Query('limit') limit?: string) {
    return this.kpiService.getTopMovingItems(days ? Number(days) : 30, limit ? Number(limit) : 10);
  }

}
