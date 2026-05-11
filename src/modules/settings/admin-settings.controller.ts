import { Controller, Get, Put, Body } from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { SettingsService } from './settings.service';
import { UpdateGeneralSettingsDto } from './dto/update-general-settings.dto';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';
import { UpdateShippingSettingsDto } from './dto/update-shipping-settings.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdateTaxSettingsDto } from './dto/update-tax-settings.dto';

@ApiTags('Admin — Settings')
@ApiBearerAuth('access-token')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('general')
  @RequirePermission('settings.read')
  @ApiOperation({ summary: 'Xem cài đặt chung (tên site, logo, liên hệ)' })
  @ApiOkResponse({
    schema: {
      example: {
        site_name: 'Computer Store',
        logo_url: 'https://res.cloudinary.com/demo/logo.png',
        contact_email: 'admin@store.vn',
        contact_phone: '1800 1234',
        address: '123 Nguyễn Văn Linh, Q.7, TP.HCM',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getGeneral() {
    return this.settingsService.getGroup('general');
  }

  @Put('general')
  @RequirePermission('settings.update')
  @ApiOperation({ summary: 'Cập nhật cài đặt chung' })
  @ApiOkResponse({ schema: { example: { site_name: 'Computer Store', logo_url: '...' } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  updateGeneral(@Body() dto: UpdateGeneralSettingsDto, @CurrentUser() user: any) {
    return this.settingsService.updateGroup('general', dto as any, user.id);
  }

  @Get('payments')
  @RequirePermission('settings.read')
  @ApiOperation({ summary: 'Xem cài đặt cổng thanh toán' })
  @ApiOkResponse({
    schema: {
      example: {
        cod_enabled: 'true',
        vnpay_enabled: 'true',
        vnpay_tmn_code: 'COMPUTERSTORE',
        vnpay_hash_secret: '***',
        momo_enabled: 'false',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getPayments() {
    return this.settingsService.getGroup('payment');
  }

  @Put('payments')
  @RequirePermission('settings.update')
  @ApiOperation({ summary: 'Cập nhật cài đặt cổng thanh toán' })
  @ApiOkResponse({ schema: { example: { cod_enabled: 'true', vnpay_enabled: 'true' } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  updatePayments(@Body() dto: UpdatePaymentSettingsDto, @CurrentUser() user: any) {
    return this.settingsService.updateGroup('payment', dto as any, user.id);
  }

  @Get('shipping')
  @RequirePermission('settings.read')
  @ApiOperation({ summary: 'Xem cài đặt vận chuyển' })
  @ApiOkResponse({
    schema: {
      example: {
        free_threshold: '500000',
        standard_fee: '30000',
        express_fee: '50000',
        same_day_fee: '80000',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getShipping() {
    return this.settingsService.getGroup('shipping');
  }

  @Put('shipping')
  @RequirePermission('settings.update')
  @ApiOperation({ summary: 'Cập nhật cài đặt vận chuyển' })
  @ApiOkResponse({ schema: { example: { free_threshold: '500000', standard_fee: '30000' } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  updateShipping(@Body() dto: UpdateShippingSettingsDto, @CurrentUser() user: any) {
    return this.settingsService.updateGroup('shipping', dto as any, user.id);
  }

  @Get('notifications')
  @RequirePermission('settings.read')
  @ApiOperation({ summary: 'Xem cài đặt thông báo & SLA' })
  @ApiOkResponse({
    schema: {
      example: {
        email_enabled: 'true',
        email_from: 'noreply@computerstore.vn',
        low_stock_threshold: '5',
        return_window_days: '30',
        sla_high_priority_hours: '24',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getNotifications() {
    return this.settingsService.getGroup('notification');
  }

  @Put('notifications')
  @RequirePermission('settings.update')
  @ApiOperation({ summary: 'Cập nhật cài đặt thông báo & SLA' })
  @ApiOkResponse({ schema: { example: { email_enabled: 'true', low_stock_threshold: '5' } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  updateNotifications(@Body() dto: UpdateNotificationSettingsDto, @CurrentUser() user: any) {
    return this.settingsService.updateGroup('notification', dto as any, user.id);
  }

  @Get('tax')
  @RequirePermission('settings.read')
  @ApiOperation({ summary: 'Xem cài đặt thuế' })
  @ApiOkResponse({
    schema: {
      example: {
        vat_enabled: 'true',
        vat_rate: '10',
        tax_id: '0123456789',
        company_name: 'Computer Store Co., Ltd.',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getTax() {
    return this.settingsService.getGroup('tax');
  }

  @Put('tax')
  @RequirePermission('settings.update')
  @ApiOperation({ summary: 'Cập nhật cài đặt thuế' })
  @ApiOkResponse({ schema: { example: { vat_enabled: 'true', vat_rate: '10' } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  updateTax(@Body() dto: UpdateTaxSettingsDto, @CurrentUser() user: any) {
    return this.settingsService.updateGroup('tax', dto as any, user.id);
  }
}
