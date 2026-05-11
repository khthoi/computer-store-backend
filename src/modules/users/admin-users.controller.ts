import {
  Controller,
  Get,
  Patch,
  Put,
  Post,
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
  ApiCreatedResponse,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { CustomerDetailResponseDto, CustomerListResponseDto } from './dto/customer-response.dto';
import { ShippingAddressResponseDto } from './dto/shipping-address-response.dto';
import { AdminUpdateCustomerDto } from './dto/admin-update-customer.dto';
import { AdminCreateCustomerDto } from './dto/admin-create-customer.dto';
import { AdminCreateAddressDto, AdminUpdateAddressDto } from './dto/admin-address.dto';
import { RequirePermission } from '../../common/decorators/permission.decorator';

@ApiTags('Admin — Customers')
@ApiBearerAuth('access-token')
@Controller('admin/customers')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('users.read')
  @ApiOperation({ summary: 'Danh sách khách hàng' })
  @ApiQuery({ name: 'q', required: false, description: 'Tìm theo tên hoặc email', example: 'Nguyễn Văn A' })
  @ApiQuery({ name: 'status', required: false, description: 'Lọc theo trạng thái', example: 'HoatDong' })
  @ApiQuery({ name: 'page', required: false, description: 'Trang hiện tại', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Số bản ghi mỗi trang', example: 20 })
  @ApiOkResponse({ type: CustomerListResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAll(@Query() query: QueryCustomersDto) {
    return this.usersService.findAll(query);
  }

  @Post()
  @RequirePermission('users.create')
  @ApiOperation({ summary: 'Tạo khách hàng mới' })
  @ApiCreatedResponse({ type: CustomerDetailResponseDto })
  @ApiResponse({ status: 409, description: 'Email đã được sử dụng' })
  create(@Body() dto: AdminCreateCustomerDto) {
    return this.usersService.adminCreate(dto);
  }

  @Get('next-code')
  @RequirePermission('users.read')
  @ApiOperation({ summary: 'Lấy mã khách hàng tiếp theo (ước tính — chỉ dùng để hiển thị preview)' })
  @ApiOkResponse({ schema: { example: { code: 'KH-0010' } } })
  getNextCode() {
    return this.usersService.getNextCode();
  }

  @Get(':id')
  @RequirePermission('users.read')
  @ApiOperation({ summary: 'Chi tiết khách hàng' })
  @ApiParam({ name: 'id', example: 5 })
  @ApiOkResponse({ type: CustomerDetailResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Khách hàng không tồn tại' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findByIdWithAddresses(id);
  }

  @Patch(':id')
  @RequirePermission('users.update')
  @ApiOperation({ summary: 'Cập nhật thông tin khách hàng (tên, điện thoại, giới tính, ngày sinh, trạng thái)' })
  @ApiParam({ name: 'id', example: 5 })
  @ApiOkResponse({ type: CustomerDetailResponseDto })
  @ApiResponse({ status: 404, description: 'Khách hàng không tồn tại' })
  updateProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateCustomerDto,
  ) {
    return this.usersService.adminUpdateFull(id, dto);
  }

  @Put(':id/status')
  @RequirePermission('users.update')
  @ApiOperation({ summary: 'Cập nhật trạng thái khách hàng (legacy — dùng PATCH /:id thay thế)' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('trangThai') trangThai: string,
  ) {
    return this.usersService.adminUpdate(id, { trangThai } as never);
  }

  @Delete(':id')
  @RequirePermission('users.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Khoá tài khoản khách hàng (soft delete)' })
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.softDelete(id);
  }

  // ─── Address sub-resource ──────────────────────────────────────────────────

  @Post(':id/addresses')
  @RequirePermission('users.update')
  @ApiOperation({ summary: 'Thêm địa chỉ giao hàng cho khách hàng' })
  @ApiParam({ name: 'id', example: 5 })
  @ApiCreatedResponse({ type: ShippingAddressResponseDto })
  @ApiResponse({ status: 404, description: 'Khách hàng không tồn tại' })
  addAddress(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminCreateAddressDto,
  ) {
    return this.usersService.adminAddAddress(id, dto);
  }

  @Put(':id/addresses/:addressId')
  @RequirePermission('users.update')
  @ApiOperation({ summary: 'Cập nhật địa chỉ giao hàng' })
  @ApiParam({ name: 'id', example: 5 })
  @ApiParam({ name: 'addressId', example: 1 })
  @ApiOkResponse({ type: ShippingAddressResponseDto })
  @ApiResponse({ status: 404, description: 'Địa chỉ không tồn tại' })
  updateAddress(
    @Param('id', ParseIntPipe) id: number,
    @Param('addressId', ParseIntPipe) addressId: number,
    @Body() dto: AdminUpdateAddressDto,
  ) {
    return this.usersService.adminUpdateAddress(id, addressId, dto);
  }

  @Delete(':id/addresses/:addressId')
  @RequirePermission('users.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá địa chỉ giao hàng' })
  @ApiParam({ name: 'id', example: 5 })
  @ApiParam({ name: 'addressId', example: 1 })
  @ApiResponse({ status: 404, description: 'Địa chỉ không tồn tại' })
  deleteAddress(
    @Param('id', ParseIntPipe) id: number,
    @Param('addressId', ParseIntPipe) addressId: number,
  ) {
    return this.usersService.deleteAddress(id, addressId);
  }

  @Put(':id/addresses/:addressId/default')
  @RequirePermission('users.update')
  @ApiOperation({ summary: 'Đặt làm địa chỉ mặc định' })
  @ApiParam({ name: 'id', example: 5 })
  @ApiParam({ name: 'addressId', example: 1 })
  @ApiOkResponse({ type: ShippingAddressResponseDto })
  @ApiResponse({ status: 404, description: 'Địa chỉ không tồn tại' })
  setDefaultAddress(
    @Param('id', ParseIntPipe) id: number,
    @Param('addressId', ParseIntPipe) addressId: number,
  ) {
    return this.usersService.setDefaultAddress(id, addressId);
  }
}
