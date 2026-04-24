import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Thông tin công khai của site (tên, logo, liên hệ)' })
  @ApiOkResponse({
    schema: {
      example: {
        site_name: 'Computer Store',
        logo_url: 'https://res.cloudinary.com/demo/logo.png',
        favicon_url: 'https://res.cloudinary.com/demo/favicon.ico',
        contact_email: 'admin@store.vn',
        contact_phone: '1800 1234',
        address: '123 Nguyễn Văn Linh, Q.7, TP.HCM',
        social_facebook: 'https://facebook.com/computerstore',
        social_zalo: 'https://zalo.me/computerstore',
      },
    },
  })
  getPublicConfig() {
    return this.settingsService.getPublicConfig();
  }
}
