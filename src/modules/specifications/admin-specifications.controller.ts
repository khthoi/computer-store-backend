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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiResponse,
} from '@nestjs/swagger';
import { SpecificationsService } from './specifications.service';
import { CreateSpecGroupDto } from './dto/create-spec-group.dto';
import { CreateSpecTypeDto } from './dto/create-spec-type.dto';
import { LinkCategoryGroupDto } from './dto/link-category-group.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin — Specifications')
@ApiBearerAuth('access-token')
@Roles('admin', 'staff')
@Controller('admin/specs')
export class AdminSpecificationsController {
  constructor(private readonly specsService: SpecificationsService) {}

  // ── Groups ────────────────────────────────────────────────────────────────

  @Get('groups')
  @ApiOperation({ summary: 'Danh sách nhóm thông số' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, name: 'Bộ xử lý', specTypeId: 1, typeName: 'CPU', sortOrder: 1 },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAllGroups() {
    return this.specsService.findAllGroups();
  }

  @Post('groups')
  @ApiOperation({ summary: 'Tạo nhóm thông số' })
  createGroup(@Body() dto: CreateSpecGroupDto) {
    return this.specsService.createGroup(dto);
  }

  @Put('groups/:id')
  @ApiOperation({ summary: 'Cập nhật nhóm thông số' })
  updateGroup(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateSpecGroupDto) {
    return this.specsService.updateGroup(id, dto);
  }

  @Delete('groups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá nhóm thông số' })
  removeGroup(@Param('id', ParseIntPipe) id: number) {
    return this.specsService.removeGroup(id);
  }

  // ── Types ─────────────────────────────────────────────────────────────────

  @Get('types')
  @ApiOperation({ summary: 'Danh sách loại thông số' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, name: 'CPU', slug: 'cpu' },
        { id: 2, name: 'RAM', slug: 'ram' },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAllTypes() {
    return this.specsService.findAllTypes();
  }

  @Post('types')
  @ApiOperation({ summary: 'Tạo loại thông số' })
  createType(@Body() dto: CreateSpecTypeDto) {
    return this.specsService.createType(dto);
  }

  @Put('types/:id')
  @ApiOperation({ summary: 'Cập nhật loại thông số' })
  updateType(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateSpecTypeDto) {
    return this.specsService.updateType(id, dto);
  }

  @Delete('types/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá loại thông số' })
  removeType(@Param('id', ParseIntPipe) id: number) {
    return this.specsService.removeType(id);
  }

  // ── Category ↔ Group links ────────────────────────────────────────────────

  @Post('category-groups')
  @ApiOperation({ summary: 'Gán nhóm thông số vào danh mục' })
  linkCategoryGroup(@Body() dto: LinkCategoryGroupDto) {
    return this.specsService.linkCategoryGroup(dto);
  }

  @Delete('category-groups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Gỡ nhóm thông số khỏi danh mục' })
  unlinkCategoryGroup(@Param('id', ParseIntPipe) id: number) {
    return this.specsService.unlinkCategoryGroup(id);
  }
}
