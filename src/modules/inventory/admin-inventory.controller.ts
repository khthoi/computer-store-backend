import {
  Controller, Get, Post, Put, Param, Body, ParseIntPipe, Query, Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { InventoryService } from './inventory.service';
import { InventoryImportsService } from './inventory-imports.service';
import { QueryStockDto } from './dto/query-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateImportReceiptDto } from './dto/create-import-receipt.dto';
import { ApproveImportDto } from './dto/approve-import.dto';

@ApiTags('Admin — Inventory')
@ApiBearerAuth()
@Controller('admin/inventory')
@Roles('admin', 'warehouse', 'staff')
export class AdminInventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly importsService: InventoryImportsService,
  ) {}

  @Get('warehouses')
  @ApiOperation({ summary: '[Admin] Danh sách kho hàng' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          name: 'Kho Hà Nội',
          address: '123 Phố Huế, Hai Bà Trưng, Hà Nội',
          isActive: true,
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findWarehouses() {
    return this.inventoryService.findAllWarehouses();
  }

  @Get()
  @ApiOperation({ summary: '[Admin] Xem mức tồn kho theo bộ lọc' })
  @ApiQuery({ name: 'khoId', required: false, example: 1, description: 'Lọc theo kho' })
  @ApiQuery({ name: 'lowStockOnly', required: false, example: false, description: 'Chỉ lấy sản phẩm dưới ngưỡng cảnh báo' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Trang hiện tại' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Số bản ghi mỗi trang' })
  @ApiOkResponse({
    schema: {
      example: {
        items: [
          {
            variantId: 20,
            warehouseId: 1,
            soLuongTon: 150,
            soLuongDatTruoc: 10,
          },
        ],
        total: 80,
        page: 1,
        limit: 20,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findStockLevels(@Query() query: QueryStockDto) {
    return this.inventoryService.findStockLevels(query);
  }

  @Get(':variantId/history')
  @ApiOperation({ summary: '[Admin] Lịch sử tồn kho theo phiên bản sản phẩm' })
  @ApiParam({ name: 'variantId', example: 20 })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 200,
          type: 'import',
          delta: 50,
          soLuongSau: 150,
          note: 'Nhập hàng tháng 3',
          createdAt: '2024-03-01T08:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findHistory(@Param('variantId', ParseIntPipe) variantId: number) {
    return this.inventoryService.findHistoryByVariant(variantId);
  }

  @Post('adjust')
  @ApiOperation({ summary: 'Điều chỉnh tồn kho thủ công (nhập/xuất/điều chuyển)' })
  @ApiResponse({ status: 201, description: 'Tồn kho đã được điều chỉnh thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  adjustStock(@Body() dto: AdjustStockDto, @Request() req: any) {
    return this.inventoryService.adjustStock(dto, req.user?.employeeId ?? req.user?.sub);
  }

  @Get('import')
  @ApiOperation({ summary: '[Admin] Danh sách phiếu nhập kho' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 10,
          supplierId: 3,
          supplierName: 'Distributor ABC',
          status: 'pending',
          totalAmount: 50000000,
          createdAt: '2024-03-01T08:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAllImports() {
    return this.importsService.findAll();
  }

  @Get('import/:id')
  @ApiOperation({ summary: '[Admin] Chi tiết phiếu nhập kho' })
  @ApiParam({ name: 'id', example: 10 })
  @ApiOkResponse({
    schema: {
      example: {
        id: 10,
        supplierId: 3,
        status: 'pending',
        items: [
          {
            variantId: 20,
            quantity: 50,
            costPrice: 12000000,
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Phiếu nhập không tồn tại' })
  findOneImport(@Param('id', ParseIntPipe) id: number) {
    return this.importsService.findOne(id);
  }

  @Post('import')
  @ApiOperation({ summary: 'Tạo phiếu nhập kho mới' })
  @ApiResponse({ status: 201, description: 'Phiếu nhập đã được tạo, chờ duyệt' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  createImport(@Body() dto: CreateImportReceiptDto, @Request() req: any) {
    return this.importsService.create(dto, req.user?.employeeId ?? req.user?.sub);
  }

  @Put('import/:id/approve')
  @ApiOperation({ summary: 'Duyệt phiếu nhập kho và cập nhật tồn kho' })
  @ApiParam({ name: 'id', example: 10 })
  @ApiResponse({ status: 200, description: 'Phiếu nhập đã được duyệt, tồn kho đã cập nhật' })
  @ApiResponse({ status: 400, description: 'Phiếu nhập không ở trạng thái chờ duyệt' })
  @ApiResponse({ status: 404, description: 'Phiếu nhập không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  approveImport(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveImportDto,
    @Request() req: any,
  ) {
    return this.importsService.approve(id, req.user?.employeeId ?? req.user?.sub, dto);
  }

  @Put('import/:id/reject')
  @ApiOperation({ summary: 'Từ chối phiếu nhập kho' })
  @ApiParam({ name: 'id', example: 10 })
  @ApiResponse({ status: 200, description: 'Phiếu nhập đã bị từ chối' })
  @ApiResponse({ status: 400, description: 'Phiếu nhập không ở trạng thái chờ duyệt' })
  @ApiResponse({ status: 404, description: 'Phiếu nhập không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  rejectImport(@Param('id', ParseIntPipe) id: number) {
    return this.importsService.reject(id);
  }
}
