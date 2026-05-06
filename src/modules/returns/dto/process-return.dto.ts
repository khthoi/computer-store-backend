import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInspectionDto {
  @ApiProperty({ example: 'Hàng bị trầy xước mặt trên, thiếu 1 phụ kiện sạc', description: 'Kết quả kiểm tra hàng thực tế' })
  @IsString()
  inspectionResult: string;
}

// DaNhanHang chỉ được set qua PATCH /confirm-received — không được set qua endpoint này
const ALLOWED_MANUAL_STATUSES = ['DaDuyet', 'TuChoi', 'DangXuLy', 'HoanThanh'] as const;

export class RejectAfterInspectionDto {
  @ApiPropertyOptional({ example: 'GHTK-REJ-2025-001', description: 'Mã vận đơn trả hàng lại cho khách' })
  @IsOptional()
  @IsString()
  rejectTrackingCode?: string;

  @ApiPropertyOptional({ example: 'GHTK', description: 'Đơn vị vận chuyển trả lại khách' })
  @IsOptional()
  @IsString()
  rejectCarrier?: string;

  @ApiPropertyOptional({ example: 'Hàng không đúng mô tả, từ chối nhận và hoàn trả khách' })
  @IsOptional()
  @IsString()
  rejectNotes?: string;
}

export class ProcessReturnDto {
  @ApiProperty({
    enum: ALLOWED_MANUAL_STATUSES,
    example: 'DaDuyet',
    description: 'Không bao gồm DaNhanHang — dùng PATCH /:id/confirm-received',
  })
  @IsEnum(ALLOWED_MANUAL_STATUSES)
  status: 'DaDuyet' | 'TuChoi' | 'DangXuLy' | 'HoanThanh';

  @ApiPropertyOptional({ example: 'Hàng đập khi kiểm tra', description: 'Kết quả kiểm tra thực tế' })
  @IsOptional()
  @IsString()
  inspectionResult?: string;

  @ApiPropertyOptional({ enum: ['GiaoHangMoi', 'HoanTien', 'BaoHanh'], example: 'HoanTien' })
  @IsOptional()
  @IsEnum(['GiaoHangMoi', 'HoanTien', 'BaoHanh'])
  resolution?: 'GiaoHangMoi' | 'HoanTien' | 'BaoHanh';
}
