import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ example: true, description: 'Bật/tắt nhận thông báo qua email' })
  @IsBoolean()
  emailNotificationsEnabled: boolean;
}
