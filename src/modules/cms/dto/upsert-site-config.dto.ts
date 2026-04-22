import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertSiteConfigDto {
  @ApiProperty({ description: 'Giá trị config (JSON string hoặc plain string)' })
  @IsString()
  value: string;
}
