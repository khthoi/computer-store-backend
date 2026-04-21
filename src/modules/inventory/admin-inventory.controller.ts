import {
  Controller, Get, Post, Put, Param, Body, ParseIntPipe, Query, Request,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { InventoryService } from './inventory.service';
import { InventoryImportsService } from './inventory-imports.service';
import { QueryStockDto } from './dto/query-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateImportReceiptDto } from './dto/create-import-receipt.dto';
import { ApproveImportDto } from './dto/approve-import.dto';

@ApiTags('Admin — Inventory')
@Controller('admin/inventory')
@Roles('admin', 'warehouse', 'staff')
export class AdminInventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly importsService: InventoryImportsService,
  ) {}

  @Get('warehouses')
  findWarehouses() {
    return this.inventoryService.findAllWarehouses();
  }

  @Get()
  findStockLevels(@Query() query: QueryStockDto) {
    return this.inventoryService.findStockLevels(query);
  }

  @Get(':variantId/history')
  findHistory(@Param('variantId', ParseIntPipe) variantId: number) {
    return this.inventoryService.findHistoryByVariant(variantId);
  }

  @Post('adjust')
  adjustStock(@Body() dto: AdjustStockDto, @Request() req: any) {
    return this.inventoryService.adjustStock(dto, req.user?.employeeId ?? req.user?.sub);
  }

  @Get('import')
  findAllImports() {
    return this.importsService.findAll();
  }

  @Get('import/:id')
  findOneImport(@Param('id', ParseIntPipe) id: number) {
    return this.importsService.findOne(id);
  }

  @Post('import')
  createImport(@Body() dto: CreateImportReceiptDto, @Request() req: any) {
    return this.importsService.create(dto, req.user?.employeeId ?? req.user?.sub);
  }

  @Put('import/:id/approve')
  approveImport(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveImportDto,
    @Request() req: any,
  ) {
    return this.importsService.approve(id, req.user?.employeeId ?? req.user?.sub, dto);
  }

  @Put('import/:id/reject')
  rejectImport(@Param('id', ParseIntPipe) id: number) {
    return this.importsService.reject(id);
  }
}
