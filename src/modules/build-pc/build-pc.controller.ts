import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiParam, ApiResponse } from '@nestjs/swagger';
import { BuildPcService } from './build-pc.service';
import { CreateSavedBuildDto } from './dto/create-saved-build.dto';
import { CheckCompatibilityDto } from './dto/check-compatibility.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('BuildPC')
@Controller('build-pc')
export class BuildPcController {
  constructor(private readonly buildPcService: BuildPcService) {}

  @Public()
  @Get('slots')
  @ApiOperation({ summary: 'Danh sách slot linh kiện' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, name: 'CPU', slotType: 'cpu', isRequired: true, sortOrder: 1 },
        { id: 2, name: 'Mainboard', slotType: 'mainboard', isRequired: true, sortOrder: 2 },
        { id: 3, name: 'RAM', slotType: 'ram', isRequired: true, sortOrder: 3 },
      ],
    },
  })
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
  @ApiOperation({ summary: 'Danh sách cấu hình đã lưu của tôi' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          name: 'Máy gaming tầm trung',
          totalPrice: 25000000,
          isPublic: false,
          createdAt: '2024-03-01T10:00:00.000Z',
        },
        {
          id: 2,
          name: 'PC văn phòng',
          totalPrice: 12000000,
          isPublic: true,
          createdAt: '2024-03-10T14:30:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findMyBuilds(@CurrentUser() user: JwtPayload) {
    return this.buildPcService.findMyBuilds(user.sub);
  }

  @Post('saved')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lưu cấu hình PC' })
  create(@Body() dto: CreateSavedBuildDto, @CurrentUser() user: JwtPayload) {
    return this.buildPcService.create(dto, user.sub);
  }

  @Public()
  @Get('saved/:id')
  @ApiOperation({ summary: 'Chi tiết cấu hình đã lưu (public nếu isPublic=true)' })
  @ApiParam({ name: 'id', description: 'ID của cấu hình đã lưu', example: 1 })
  @ApiOkResponse({
    schema: {
      example: {
        id: 1,
        name: 'Máy gaming tầm trung',
        totalPrice: 25000000,
        isPublic: true,
        items: [
          { slotId: 1, variantId: 20 },
          { slotId: 2, variantId: 35 },
          { slotId: 3, variantId: 48 },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Cấu hình không tồn tại hoặc không công khai' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload | null) {
    return this.buildPcService.findOne(id, user?.sub);
  }

  @Delete('saved/:id')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá cấu hình đã lưu' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.buildPcService.remove(id, user.sub);
  }
}
