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
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiParam, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { BuildPcService } from './build-pc.service';
import { SavedBuildsService } from './saved-builds.service';
import { CommunityBuildsService } from './community-builds.service';
import { CreateSavedBuildDto } from './dto/create-saved-build.dto';
import { UpdateSavedBuildDto } from './dto/update-saved-build.dto';
import { CheckCompatibilityDto } from './dto/check-compatibility.dto';
import { QueryCommunityBuildsDto } from './dto/query-community-builds.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('BuildPC')
@Controller('build-pc')
export class BuildPcController {
  constructor(
    private readonly buildPcService: BuildPcService,
    private readonly savedBuildsService: SavedBuildsService,
    private readonly communityBuildsService: CommunityBuildsService,
  ) {}

  @Public()
  @Get('slots')
  @ApiOperation({ summary: 'Danh sách slot linh kiện' })
  findAllSlots() {
    return this.buildPcService.findAllSlots();
  }

  @Public()
  @Post('check-compatibility')
  @ApiOperation({ summary: 'Kiểm tra tương thích linh kiện' })
  checkCompatibility(@Body() dto: CheckCompatibilityDto) {
    return this.buildPcService.checkCompatibility(dto);
  }

  @Get('saved')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Danh sách cấu hình đã lưu của tôi (tối đa 5)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findMyBuilds(@CurrentUser() user: JwtPayload) {
    return this.savedBuildsService.findMine(user.sub);
  }

  @Post('saved')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lưu cấu hình PC (tối đa 5 cấu hình / khách hàng)' })
  create(@Body() dto: CreateSavedBuildDto, @CurrentUser() user: JwtPayload) {
    return this.savedBuildsService.create(dto, user.sub);
  }

  @Put('saved/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cập nhật cấu hình đã lưu (tên, mô tả, isPublic, danh sách linh kiện)' })
  @ApiParam({ name: 'id', description: 'ID của cấu hình đã lưu', example: 1 })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSavedBuildDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.savedBuildsService.update(id, dto, user.sub);
  }

  @Public()
  @Get('saved/:id')
  @ApiOperation({ summary: 'Chi tiết cấu hình đã lưu (public nếu isPublic=true)' })
  @ApiParam({ name: 'id', description: 'ID của cấu hình đã lưu', example: 1 })
  @ApiOkResponse({ description: 'Chi tiết cấu hình kèm phiên bản sản phẩm và thương hiệu' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập (build không công khai)' })
  @ApiResponse({ status: 404, description: 'Cấu hình không tồn tại' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload | null) {
    return this.savedBuildsService.findOne(id, user?.sub);
  }

  @Delete('saved/:id')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá cấu hình đã lưu' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.savedBuildsService.remove(id, user.sub);
  }

  // ── Community endpoints ──────────────────────────────────────────────────

  @Public()
  @Get('community')
  @ApiOperation({ summary: 'Danh sách cấu hình PC công khai từ cộng đồng' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['newest', 'views', 'clones', 'price-asc', 'price-desc'] })
  findCommunity(@Query() query: QueryCommunityBuildsDto) {
    return this.communityBuildsService.findCommunity(query);
  }

  @Public()
  @Get('community/:id')
  @ApiOperation({ summary: 'Chi tiết cấu hình PC công khai' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 404, description: 'Cấu hình không tồn tại hoặc không công khai' })
  findCommunityOne(@Param('id', ParseIntPipe) id: number) {
    return this.communityBuildsService.findCommunityOne(id);
  }

  @Public()
  @Post('community/:id/view')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Tăng số lượt xem (rate-limit 10 phút / IP)' })
  @ApiParam({ name: 'id', example: 1 })
  async incrementCommunityView(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @CurrentUser() user: JwtPayload | null,
  ) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)?.split(',')[0]?.trim()
      ?? req.socket.remoteAddress
      ?? 'unknown';
    const ipKey = user?.sub != null ? `u${user.sub}` : `ip:${ip}`;
    await this.communityBuildsService.incrementView(id, ipKey);
  }

  @Post('community/:id/clone')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Clone cấu hình PC công khai về tài khoản (tối đa 5)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 400, description: 'Vượt quá giới hạn 5 cấu hình' })
  @ApiResponse({ status: 404, description: 'Cấu hình gốc không tồn tại hoặc không công khai' })
  cloneCommunity(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.communityBuildsService.cloneToCustomer(id, user.sub);
  }
}
