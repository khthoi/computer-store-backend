import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BuildPcService } from './build-pc.service';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { CreateBuildSlotDto } from './dto/create-build-slot.dto';
import { UpdateBuildSlotDto } from './dto/update-build-slot.dto';
import { CreateCompatibilityRuleDto } from './dto/create-compatibility-rule.dto';
import { UpdateCompatibilityRuleDto } from './dto/update-compatibility-rule.dto';

@ApiTags('Admin — BuildPC')
@ApiBearerAuth('access-token')
@Controller('admin/build-pc')
export class AdminBuildPcController {
  constructor(private readonly buildPcService: BuildPcService) {}

  // ── Slots ─────────────────────────────────────────────────────────────────

  @Get('slots')
  @RequirePermission('build-pc.read')
  @ApiOperation({ summary: 'List all Build-PC slot definitions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAllSlots() {
    return this.buildPcService.findAllSlots();
  }

  @Post('slots')
  @RequirePermission('build-pc.create')
  @ApiOperation({ summary: 'Tạo slot' })
  createSlot(@Body() dto: CreateBuildSlotDto) {
    return this.buildPcService.createSlot(dto);
  }

  @Patch('slots/reorder')
  @RequirePermission('build-pc.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cập nhật thứ tự hiển thị các slot' })
  reorderSlots(@Body() dto: { ids: number[] }) {
    return this.buildPcService.reorderSlots(dto.ids);
  }

  @Put('slots/:id')
  @RequirePermission('build-pc.update')
  @ApiOperation({ summary: 'Cập nhật slot' })
  updateSlot(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBuildSlotDto) {
    return this.buildPcService.updateSlot(id, dto);
  }

  @Delete('slots/:id')
  @RequirePermission('build-pc.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá slot' })
  removeSlot(@Param('id', ParseIntPipe) id: number) {
    return this.buildPcService.removeSlot(id);
  }

  // ── Tech keys ─────────────────────────────────────────────────────────────

  @Get('tech-keys')
  @RequirePermission('build-pc.read')
  @ApiOperation({ summary: 'Danh sách thông số kỹ thuật dùng được trong quy tắc tương thích' })
  findTechKeys(@Query('categoryIds') categoryIds?: string) {
    const ids = categoryIds
      ? categoryIds.split(',').map(Number).filter((n) => !isNaN(n))
      : undefined;
    return this.buildPcService.findTechKeys(ids);
  }

  // ── Rules ─────────────────────────────────────────────────────────────────

  @Get('rules')
  @RequirePermission('build-pc.read')
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
  @RequirePermission('build-pc.create')
  @ApiOperation({ summary: 'Tạo quy tắc tương thích' })
  createRule(@Body() dto: CreateCompatibilityRuleDto) {
    return this.buildPcService.createRule(dto);
  }

  @Put('rules/:id')
  @RequirePermission('build-pc.update')
  @ApiOperation({ summary: 'Cập nhật quy tắc' })
  updateRule(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCompatibilityRuleDto) {
    return this.buildPcService.updateRule(id, dto);
  }

  @Delete('rules/:id')
  @RequirePermission('build-pc.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Vô hiệu hóa quy tắc' })
  removeRule(@Param('id', ParseIntPipe) id: number) {
    return this.buildPcService.removeRule(id);
  }

  // ── Saved Builds (admin read-only) ─────────────────────────────────────────

  @Get('builds')
  @RequirePermission('build-pc.read')
  @ApiOperation({ summary: 'Danh sách build đã lưu (admin)' })
  findAllBuilds(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.buildPcService.findAllBuildsAdmin({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status: status || undefined,
      search: search || undefined,
      customerId: customerId ? parseInt(customerId, 10) : undefined,
    });
  }

  @Get('builds/:id')
  @RequirePermission('build-pc.read')
  @ApiOperation({ summary: 'Chi tiết một build (admin)' })
  findBuildDetail(@Param('id', ParseIntPipe) id: number) {
    return this.buildPcService.findBuildDetailAdmin(id);
  }
}
