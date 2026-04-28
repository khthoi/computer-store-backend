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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { SpecificationsService } from './specifications.service';
import { CreateSpecGroupDto } from './dto/create-spec-group.dto';
import { CreateSpecTypeDto } from './dto/create-spec-type.dto';
import { UpdateSpecTypeDto } from './dto/update-spec-type.dto';
import { LinkCategoryGroupDto } from './dto/link-category-group.dto';
import { SpecGroupResponseDto, SpecTypeResponseDto } from './dto/spec-group-response.dto';
import { CategorySpecGroupResponseDto } from './dto/category-spec-group-response.dto';
import { Roles } from '../../common/decorators/roles.decorator';

class UpdateCategoryGroupDto {
  @IsOptional() @IsBoolean() hienThiBoLoc?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() thuTuBoLoc?: number;
  @IsOptional() @Type(() => Number) @IsInt() thuTuHienThi?: number;
}

class ReorderCategoryGroupsDto {
  @Type(() => Number) @IsInt() categoryId: number;
  @IsArray() @IsInt({ each: true }) @Type(() => Number) orderedGroupIds: number[];
}

@ApiTags('Admin — Specifications')
@ApiBearerAuth('access-token')
@Roles('admin', 'staff')
@Controller('admin/specs')
export class AdminSpecificationsController {
  constructor(private readonly specsService: SpecificationsService) {}

  // ── Groups ────────────────────────────────────────────────────────────────

  @Get('groups')
  @ApiOperation({ summary: 'Danh sách nhóm thông số' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAllGroups(): Promise<SpecGroupResponseDto[]> {
    const groups = await this.specsService.findAllGroups();
    return groups.map((g) => SpecGroupResponseDto.from(g, true));
  }

  @Post('groups')
  @ApiOperation({ summary: 'Tạo nhóm thông số' })
  async createGroup(@Body() dto: CreateSpecGroupDto): Promise<SpecGroupResponseDto> {
    const group = await this.specsService.createGroup(dto);
    return SpecGroupResponseDto.from(group, false);
  }

  @Put('groups/:id')
  @ApiOperation({ summary: 'Cập nhật nhóm thông số' })
  async updateGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSpecGroupDto,
  ): Promise<SpecGroupResponseDto> {
    const group = await this.specsService.updateGroup(id, dto);
    return SpecGroupResponseDto.from(group, true);
  }

  @Get('groups/:id')
  @ApiOperation({ summary: 'Chi tiết nhóm thông số' })
  async findOneGroup(@Param('id', ParseIntPipe) id: number): Promise<SpecGroupResponseDto> {
    const group = await this.specsService.findOneGroup(id);
    return SpecGroupResponseDto.from(group, true);
  }

  @Delete('groups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá nhóm thông số' })
  removeGroup(@Param('id', ParseIntPipe) id: number) {
    return this.specsService.removeGroup(id);
  }

  // ── Types ─────────────────────────────────────────────────────────────────

  @Get('types')
  @ApiOperation({ summary: 'Danh sách loại thông số (có thể lọc theo groupId)' })
  @ApiQuery({ name: 'groupId', required: false, type: Number })
  async findAllTypes(@Query('groupId') groupId?: string): Promise<SpecTypeResponseDto[]> {
    const nhomThongSoId = groupId ? parseInt(groupId, 10) : undefined;
    const types = await this.specsService.findAllTypes(nhomThongSoId);
    return types.map(SpecTypeResponseDto.from);
  }

  @Post('types')
  @ApiOperation({ summary: 'Tạo loại thông số' })
  async createType(@Body() dto: CreateSpecTypeDto): Promise<SpecTypeResponseDto> {
    const t = await this.specsService.createType(dto);
    return SpecTypeResponseDto.from(t);
  }

  @Put('types/:id')
  @ApiOperation({ summary: 'Cập nhật loại thông số' })
  async updateType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSpecTypeDto,
  ): Promise<SpecTypeResponseDto> {
    const t = await this.specsService.updateType(id, dto);
    return SpecTypeResponseDto.from(t);
  }

  @Patch('types/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Sắp xếp lại loại thông số trong một nhóm' })
  reorderSpecTypes(@Body() dto: { groupId: number; orderedIds: number[] }) {
    return this.specsService.reorderSpecTypes(dto.groupId, dto.orderedIds);
  }

  @Delete('types/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá loại thông số' })
  removeType(@Param('id', ParseIntPipe) id: number) {
    return this.specsService.removeType(id);
  }

  // ── Spec template ─────────────────────────────────────────────────────────

  @Get('template')
  @ApiOperation({ summary: 'Template thông số kỹ thuật theo danh mục (kể cả kế thừa từ cha)' })
  getSpecTemplate(@Query('categoryId') categoryId?: string) {
    const id = parseInt(categoryId ?? '', 10);
    if (isNaN(id)) return [];
    return this.specsService.getSpecTemplateForCategory(id);
  }

  // ── Category ↔ Group links ────────────────────────────────────────────────

  // NOTE: /resolved and / (GET) must be defined before /:id routes to avoid route conflict
  @Get('category-groups/resolved')
  @ApiOperation({ summary: 'Resolved spec group view (3 buckets) cho một danh mục' })
  @ApiQuery({ name: 'categoryId', required: true, type: Number })
  getResolvedView(@Query('categoryId') categoryId?: string) {
    const id = parseInt(categoryId ?? '', 10);
    if (isNaN(id)) return { directIncludes: [], inheritedIncludes: [], directExcludes: [] };
    return this.specsService.getResolvedSpecGroupsView(id);
  }

  @Get('category-groups')
  @ApiOperation({ summary: 'Lấy danh sách assignment trực tiếp của một danh mục' })
  @ApiQuery({ name: 'categoryId', required: true, type: Number })
  async findGroupsByCategory(
    @Query('categoryId') categoryId?: string,
  ): Promise<CategorySpecGroupResponseDto[]> {
    const id = parseInt(categoryId ?? '', 10);
    if (isNaN(id)) return [];
    const links = await this.specsService.findGroupsByCategory(id);
    return links.map(CategorySpecGroupResponseDto.from);
  }

  @Post('category-groups')
  @ApiOperation({ summary: 'Gán (upsert) nhóm thông số vào danh mục' })
  async upsertCategoryGroup(
    @Body() dto: LinkCategoryGroupDto,
  ): Promise<CategorySpecGroupResponseDto> {
    const link = await this.specsService.upsertCategoryGroup(dto);
    return CategorySpecGroupResponseDto.from(link);
  }

  @Patch('category-groups/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Sắp xếp lại nhóm thông số trong một danh mục' })
  reorderCategoryGroups(@Body() dto: ReorderCategoryGroupsDto) {
    return this.specsService.reorderCategoryGroups(dto.categoryId, dto.orderedGroupIds);
  }

  @Patch('category-groups/:id')
  @ApiOperation({ summary: 'Cập nhật một assignment (hienThiBoLoc, thuTuBoLoc, thuTuHienThi)' })
  async updateCategoryGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryGroupDto,
  ): Promise<CategorySpecGroupResponseDto> {
    const link = await this.specsService.updateCategoryGroup(id, dto);
    return CategorySpecGroupResponseDto.from(link);
  }

  @Delete('category-groups')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Gỡ nhóm thông số khỏi danh mục (theo categoryId + groupId)' })
  @ApiQuery({ name: 'categoryId', required: true, type: Number })
  @ApiQuery({ name: 'groupId', required: true, type: Number })
  unlinkByPair(
    @Query('categoryId') categoryId: string,
    @Query('groupId') groupId: string,
  ) {
    return this.specsService.unlinkCategoryGroupByPair(
      parseInt(categoryId, 10),
      parseInt(groupId, 10),
    );
  }

  @Delete('category-groups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Gỡ nhóm thông số khỏi danh mục (theo link ID)' })
  unlinkCategoryGroup(@Param('id', ParseIntPipe) id: number) {
    return this.specsService.unlinkCategoryGroup(id);
  }
}
