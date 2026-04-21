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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Thông tin profile của tôi' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 5,
        fullName: 'Nguyễn Văn A',
        email: 'a@example.com',
        phone: '0901234567',
        loyaltyPoints: 1200,
        status: 'HoatDong',
        createdAt: '2024-01-15T08:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.getProfile(user.sub);
  }

  @Put('me')
  @ApiOperation({ summary: 'Cập nhật profile' })
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Get('me/addresses')
  @ApiOperation({ summary: 'Danh sách địa chỉ giao hàng' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          fullName: 'Nguyễn Văn A',
          phone: '0901234567',
          address: '123 Lê Lợi',
          ward: 'Phường Bến Nghé',
          district: 'Quận 1',
          province: 'TP. Hồ Chí Minh',
          isDefault: true,
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAddresses(@CurrentUser() user: JwtPayload) {
    return this.usersService.getAddresses(user.sub);
  }

  @Post('me/addresses')
  @ApiOperation({ summary: 'Thêm địa chỉ giao hàng mới' })
  addAddress(@CurrentUser() user: JwtPayload, @Body() dto: CreateAddressDto) {
    return this.usersService.addAddress(user.sub, dto);
  }

  @Put('me/addresses/:id')
  @ApiOperation({ summary: 'Cập nhật địa chỉ giao hàng' })
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
  deleteAddress(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteAddress(user.sub, id);
  }

  @Put('me/addresses/:id/default')
  @ApiOperation({ summary: 'Đặt làm địa chỉ mặc định' })
  setDefault(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.usersService.setDefaultAddress(user.sub, id);
  }
}
