import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CustomerProfileResponseDto } from './dto/customer-response.dto';
import { ShippingAddressResponseDto } from './dto/shipping-address-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Thông tin profile của tôi' })
  @ApiOkResponse({ type: CustomerProfileResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.getProfile(user.sub);
  }

  @Put('me')
  @ApiOperation({ summary: 'Cập nhật profile' })
  @ApiOkResponse({ type: CustomerProfileResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Get('me/addresses')
  @ApiOperation({ summary: 'Danh sách địa chỉ giao hàng' })
  @ApiOkResponse({ type: [ShippingAddressResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAddresses(@CurrentUser() user: JwtPayload) {
    return this.usersService.getAddresses(user.sub);
  }

  @Post('me/addresses')
  @ApiOperation({ summary: 'Thêm địa chỉ giao hàng mới' })
  @ApiOkResponse({ type: ShippingAddressResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  addAddress(@CurrentUser() user: JwtPayload, @Body() dto: CreateAddressDto) {
    return this.usersService.addAddress(user.sub, dto);
  }

  @Put('me/addresses/:id')
  @ApiOperation({ summary: 'Cập nhật địa chỉ giao hàng' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: ShippingAddressResponseDto })
  @ApiResponse({ status: 404, description: 'Địa chỉ không tồn tại' })
  updateAddress(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(user.sub, id, dto);
  }

  @Delete('me/addresses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá địa chỉ giao hàng' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 404, description: 'Địa chỉ không tồn tại' })
  deleteAddress(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteAddress(user.sub, id);
  }

  @Put('me/addresses/:id/default')
  @ApiOperation({ summary: 'Đặt làm địa chỉ mặc định' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: ShippingAddressResponseDto })
  @ApiResponse({ status: 404, description: 'Địa chỉ không tồn tại' })
  setDefault(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.usersService.setDefaultAddress(user.sub, id);
  }
}
