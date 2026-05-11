import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  DefaultValuePipe,
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
import { EmployeeResponseDto, EmployeeListResponseDto } from './dto/employee-response.dto';
import { RequirePermission } from '../../common/decorators/permission.decorator';

@ApiTags('Admin — Employees')
@ApiBearerAuth('access-token')
@Controller('admin/employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @RequirePermission('employees.read')
  @ApiOperation({ summary: 'Danh sách nhân viên' })
  @ApiQuery({ name: 'search', required: false, description: 'Tìm theo tên hoặc email', example: 'Trần Thị B' })
  @ApiQuery({ name: 'status', required: false, description: 'Lọc theo trạng thái', enum: ['active', 'inactive'] })
  @ApiQuery({ name: 'page', required: false, description: 'Trang hiện tại', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Số bản ghi mỗi trang', example: 20 })
  @ApiOkResponse({ type: EmployeeListResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAll(@Query() query: QueryEmployeesDto) {
    return this.employeesService.findAll(query);
  }

  @Get('code/:code')
  @RequirePermission('employees.read')
  @ApiOperation({ summary: 'Chi tiết nhân viên theo mã NV' })
  @ApiParam({ name: 'code', example: 'NV-001' })
  @ApiOkResponse({ type: EmployeeResponseDto })
  @ApiResponse({ status: 404, description: 'Nhân viên không tồn tại' })
  findByCode(@Param('code') code: string) {
    return this.employeesService.findByCode(code);
  }

  @Get(':id')
  @RequirePermission('employees.read')
  @ApiOperation({ summary: 'Chi tiết nhân viên' })
  @ApiParam({ name: 'id', example: 2 })
  @ApiOkResponse({ type: EmployeeResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Nhân viên không tồn tại' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.employeesService.findOne(id);
  }

  @Get(':id/audit-logs')
  @RequirePermission('employees.read')
  @ApiOperation({ summary: 'Lịch sử hoạt động của nhân viên' })
  @ApiParam({ name: 'id', example: 2 })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'q', required: false, description: 'Tìm theo nội dung chi tiết' })
  @ApiQuery({ name: 'action', required: false, description: 'Lọc loại hành động, nhiều giá trị cách nhau bởi dấu phẩy' })
  getAuditLogs(
    @Param('id', ParseIntPipe) id: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('q') q?: string,
    @Query('action') action?: string,
  ) {
    return this.employeesService.getEmployeeAuditLogs(id, page, limit, q, action);
  }

  @Post()
  @RequirePermission('employees.create')
  @ApiOperation({ summary: 'Tạo tài khoản nhân viên mới' })
  @ApiOkResponse({ type: EmployeeResponseDto })
  @ApiResponse({ status: 409, description: 'Email hoặc mã nhân viên đã tồn tại' })
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Put(':id')
  @RequirePermission('employees.update')
  @ApiOperation({ summary: 'Cập nhật thông tin nhân viên' })
  @ApiOkResponse({ type: EmployeeResponseDto })
  @ApiResponse({ status: 404, description: 'Nhân viên không tồn tại' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('employees.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Vô hiệu hoá nhân viên (soft delete)' })
  @ApiResponse({ status: 404, description: 'Nhân viên không tồn tại' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.employeesService.remove(id);
  }

  @Put(':id/roles')
  @RequirePermission('employees.update')
  @ApiOperation({ summary: 'Gán vai trò cho nhân viên' })
  @ApiOkResponse({ type: EmployeeResponseDto })
  @ApiResponse({ status: 404, description: 'Nhân viên không tồn tại' })
  assignRoles(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignRolesDto) {
    return this.employeesService.assignRoles(id, dto.roleIds);
  }
}
