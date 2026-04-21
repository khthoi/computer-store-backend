import {
  Controller,
  Get,
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
import { UsersService } from './users.service';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin — Customers')
@ApiBearerAuth('access-token')
@Roles('admin', 'staff')
@Controller('admin/customers')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách khách hàng' })
  @ApiQuery({ name: 'q', required: false, description: 'Tìm theo tên hoặc email', example: 'Nguyễn Văn A' })
  @ApiQuery({ name: 'status', required: false, description: 'Lọc theo trạng thái', example: 'HoatDong' })
  @ApiQuery({ name: 'page', required: false, description: 'Trang hiện tại', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Số bản ghi mỗi trang', example: 20 })
  @ApiOkResponse({
    schema: {
      example: {
        items: [
          {
            id: 5,
            fullName: 'Nguyễn Văn A',
            email: 'a@example.com',
            phone: '0901234567',
            loyaltyPoints: 1200,
            status: 'HoatDong',
            createdAt: '2024-01-15T08:00:00.000Z',
          },
        ],
        total: 120,
        page: 1,
        limit: 20,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAll(@Query() query: QueryCustomersDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết khách hàng' })
  @ApiParam({ name: 'id', example: 5 })
  @ApiOkResponse({
    schema: {
      example: {
        id: 5,
        fullName: 'Nguyễn Văn A',
        email: 'a@example.com',
        phone: '0901234567',
        loyaltyPoints: 1200,
        totalOrders: 8,
        status: 'HoatDong',
        addresses: [{ id: 1, isDefault: true, address: '123 Lê Lợi, Quận 1, TP.HCM' }],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Khách hàng không tồn tại' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái khách hàng' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('trangThai') trangThai: string,
  ) {
    return this.usersService.adminUpdate(id, { trangThai } as never);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Khoá tài khoản khách hàng (soft delete)' })
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.softDelete(id);
  }
}
