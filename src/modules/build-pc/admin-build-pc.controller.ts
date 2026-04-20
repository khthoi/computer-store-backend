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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Danh sách slots' })
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
  @ApiOperation({ summary: 'Danh sách quy tắc tương thích' })
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
