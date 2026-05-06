import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmGoodsReceivedDto {
  @ApiPropertyOptional({ example: 'GHTK-RET-2025-001', description: 'Mã vận đơn khách gửi hàng về' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  returnTrackingCode?: string;

  @ApiPropertyOptional({ example: 'GHTK', description: 'Đơn vị vận chuyển khách dùng để gửi hàng về' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  returnCarrier?: string;

  @ApiPropertyOptional({ example: 'Hàng về đủ, còn nguyên seal' })
  @IsOptional()
  @IsString()
  notes?: string;
}
