import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTaxSettingsDto {
  @ApiPropertyOptional({ example: 'true', description: 'Bật/tắt VAT' })
  @IsOptional()
  @IsIn(['true', 'false'])
  vat_enabled?: string;

  @ApiPropertyOptional({ example: '10', description: 'Thuế suất VAT (%)' })
  @IsOptional()
  @IsString()
  vat_rate?: string;

  @ApiPropertyOptional({ example: '0123456789', description: 'Mã số thuế doanh nghiệp' })
  @IsOptional()
  @IsString()
  tax_id?: string;

  @ApiPropertyOptional({ example: 'Computer Store Co., Ltd.', description: 'Tên doanh nghiệp trên hóa đơn' })
  @IsOptional()
  @IsString()
  company_name?: string;

  @ApiPropertyOptional({ example: '123 Nguyễn Văn Linh, Quận 7, TP.HCM', description: 'Địa chỉ doanh nghiệp trên hóa đơn' })
  @IsOptional()
  @IsString()
  company_address?: string;
}
