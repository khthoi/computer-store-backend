import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiConsumes, ApiBody, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
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

  @Patch('me/notification-preferences')
  @ApiOperation({ summary: 'Cập nhật tùy chọn nhận thông báo' })
  @ApiOkResponse({ type: CustomerProfileResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateNotificationPreferences(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.usersService.updateNotificationPreferences(user.sub, dto.emailNotificationsEnabled);
  }

  @Patch('me/avatar')
  @ApiOperation({ summary: 'Đổi ảnh đại diện (tối đa 3 lần/ngày)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { avatar: { type: 'string', format: 'binary' } },
      required: ['avatar'],
    },
  })
  @ApiOkResponse({ type: CustomerProfileResponseDto })
  @ApiResponse({ status: 429, description: 'Đã đổi ảnh đại diện 3 lần hôm nay' })
  @UseInterceptors(FileInterceptor('avatar', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadAvatar(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn file ảnh');
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('Chỉ chấp nhận file ảnh');
    return this.usersService.uploadAvatar(user.sub, file);
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
