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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin - Customers')
@ApiBearerAuth('access-token')
@Roles('admin', 'staff')
@Controller('admin/customers')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách khách hàng' })
  findAll(@Query() query: QueryCustomersDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết khách hàng' })
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
