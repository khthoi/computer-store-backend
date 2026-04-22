import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProcessReturnDto {
  @ApiProperty({
    enum: ['DaDuyet', 'TuChoi', 'DangXuLy', 'HoanThanh'],
    example: 'DaDuyet',
  })
  @IsEnum(['DaDuyet', 'TuChoi', 'DangXuLy', 'HoanThanh'])
  status: 'DaDuyet' | 'TuChoi' | 'DangXuLy' | 'HoanThanh';

  @ApiPropertyOptional({ example: 'HangDapKhiKiemTra', description: 'Kết quả kiểm tra thực tế' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  inspectionResult?: string;

  @ApiPropertyOptional({ enum: ['GiaoHangMoi', 'HoanTien', 'BaoHanh'], example: 'HoanTien' })
  @IsOptional()
  @IsEnum(['GiaoHangMoi', 'HoanTien', 'BaoHanh'])
  resolution?: 'GiaoHangMoi' | 'HoanTien' | 'BaoHanh';
}
