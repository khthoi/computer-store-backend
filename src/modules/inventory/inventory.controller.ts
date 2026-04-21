import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Public()
  @Get('stock/:variantId')
  @ApiOperation({ summary: 'Kiểm tra tồn kho theo phiên bản sản phẩm' })
  @ApiParam({ name: 'variantId', example: 20 })
  @ApiOkResponse({
    schema: {
      example: {
        variantId: 20,
        warehouseId: 1,
        soLuongTon: 150,
        soLuongDatTruoc: 10,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Variant không tồn tại' })
  getStock(@Param('variantId', ParseIntPipe) variantId: number) {
    return this.inventoryService.findStockByVariant(variantId);
  }
}
