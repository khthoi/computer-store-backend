import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { QueryEmployeesDto } from './dto/query-employees.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin — Employees')
@ApiBearerAuth('access-token')
@Roles('admin')
@Controller('admin/employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách nhân viên' })
  @ApiQuery({ name: 'q', required: false, description: 'Tìm theo tên hoặc email', example: 'Trần Thị B' })
  @ApiQuery({ name: 'status', required: false, description: 'Lọc theo trạng thái', example: 'HoatDong' })
  @ApiQuery({ name: 'page', required: false, description: 'Trang hiện tại', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Số bản ghi mỗi trang', example: 20 })
  @ApiOkResponse({
    schema: {
      example: {
        items: [
          {
            id: 2,
            fullName: 'Trần Thị B',
            email: 'b@store.vn',
            phone: '0907654321',
            roles: ['staff'],
            status: 'HoatDong',
            createdAt: '2024-01-10T08:00:00.000Z',
          },
        ],
        total: 15,
        page: 1,
        limit: 20,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAll(@Query() query: QueryEmployeesDto) {
    return this.employeesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết nhân viên' })
  @ApiParam({ name: 'id', example: 2 })
  @ApiOkResponse({
    schema: {
      example: {
        id: 2,
        fullName: 'Trần Thị B',
        email: 'b@store.vn',
        phone: '0907654321',
        roles: [{ id: 1, name: 'staff' }],
        status: 'HoatDong',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Nhân viên không tồn tại' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.employeesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo tài khoản nhân viên mới' })
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin nhân viên' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Vô hiệu hoá nhân viên (soft delete)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.employeesService.remove(id);
  }

  @Put(':id/roles')
  @ApiOperation({ summary: 'Gán vai trò cho nhân viên' })
  assignRoles(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignRolesDto) {
    return this.employeesService.assignRoles(id, dto.roleIds);
  }
}
