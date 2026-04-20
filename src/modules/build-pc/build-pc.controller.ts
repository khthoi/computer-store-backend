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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
