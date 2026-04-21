import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BuildPcService } from './build-pc.service';
import { BuildSlot } from './entities/build-slot.entity';
import { CompatibilityRule } from './entities/compatibility-rule.entity';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin — BuildPC')
@ApiBearerAuth('access-token')
@Roles('admin', 'staff')
@Controller('admin/build-pc')
export class AdminBuildPcController {
  constructor(private readonly buildPcService: BuildPcService) {}

  // ── Slots ─────────────────────────────────────────────────────────────────

  @Get('slots')
  @ApiOperation({ summary: 'List all Build-PC slot definitions' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, tenSlot: 'CPU', danhMucId: 3, batBuoc: true, soLuongMin: 1, soLuongMax: 1, thuTu: 1, iconKey: 'cpu' },
        { id: 2, tenSlot: 'RAM', danhMucId: 5, batBuoc: true, soLuongMin: 1, soLuongMax: 4, thuTu: 2, iconKey: 'ram' },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAllSlots() {
    return this.buildPcService.findAllSlots();
  }

  @Post('slots')
  @ApiOperation({ summary: 'Tạo slot' })
  createSlot(@Body() data: Partial<BuildSlot>) {
    return this.buildPcService.createSlot(data);
  }

  @Put('slots/:id')
  @ApiOperation({ summary: 'Cập nhật slot' })
  updateSlot(@Param('id', ParseIntPipe) id: number, @Body() data: Partial<BuildSlot>) {
    return this.buildPcService.updateSlot(id, data);
  }

  @Delete('slots/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá slot' })
  removeSlot(@Param('id', ParseIntPipe) id: number) {
    return this.buildPcService.removeSlot(id);
  }

  // ── Rules ─────────────────────────────────────────────────────────────────

  @Get('rules')
  @ApiOperation({ summary: 'List all compatibility rules' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, tenQuyTac: 'CPU socket must match Mainboard socket', slotNguonId: 1, maKtNguon: 'socket', slotDichId: 2, maKtDich: 'socket', loaiKiemTra: 'exact_match', heSo: 1, thongBaoLoi: 'CPU và mainboard không tương thích socket', isActive: true, thuTu: 1 },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAllRules() {
    return this.buildPcService.findAllRules();
  }

  @Post('rules')
  @ApiOperation({ summary: 'Tạo quy tắc tương thích' })
  createRule(@Body() data: Partial<CompatibilityRule>) {
    return this.buildPcService.createRule(data);
  }

  @Put('rules/:id')
  @ApiOperation({ summary: 'Cập nhật quy tắc' })
  updateRule(@Param('id', ParseIntPipe) id: number, @Body() data: Partial<CompatibilityRule>) {
    return this.buildPcService.updateRule(id, data);
  }

  @Delete('rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Vô hiệu hóa quy tắc' })
  removeRule(@Param('id', ParseIntPipe) id: number) {
    return this.buildPcService.removeRule(id);
  }
}
