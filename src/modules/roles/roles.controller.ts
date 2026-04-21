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
  ApiParam,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin — Roles')
@ApiBearerAuth('access-token')
@Roles('admin')
@Controller('admin/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách vai trò' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          name: 'admin',
          description: 'Quản trị viên hệ thống',
          permissions: [{ id: 1, code: 'product.create' }],
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAll() {
    return this.rolesService.findAllRoles();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết vai trò' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    schema: {
      example: {
        id: 1,
        name: 'admin',
        description: 'Quản trị viên hệ thống',
        permissions: [
          { id: 1, code: 'product.create' },
          { id: 2, code: 'product.update' },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Vai trò không tồn tại' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo vai trò mới' })
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật vai trò' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá vai trò' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.remove(id);
  }

  @Put(':id/permissions')
  @ApiOperation({ summary: 'Gán quyền cho vai trò' })
  assignPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.rolesService.assignPermissions(id, dto.permissionIds);
  }
}

@ApiTags('Admin — Permissions')
@ApiBearerAuth('access-token')
@Roles('admin')
@Controller('admin/permissions')
export class PermissionsController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách tất cả quyền hạn (cached 10 phút)' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, code: 'product.create', description: 'Tạo sản phẩm' },
        { id: 2, code: 'product.update', description: 'Cập nhật sản phẩm' },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAll() {
    return this.rolesService.findAllPermissions();
  }
}
