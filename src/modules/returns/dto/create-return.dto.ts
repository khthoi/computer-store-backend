import {
  IsInt, IsString, IsEnum, IsOptional, IsArray, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReturnDto {
  @ApiProperty({ example: 15, description: 'ID đơn hàng muốn đổi/trả' })
  @IsInt()
  orderId: number;

  @ApiProperty({ enum: ['DoiHang', 'TraHang', 'BaoHanh'], example: 'TraHang' })
  @IsEnum(['DoiHang', 'TraHang', 'BaoHanh'])
  requestType: 'DoiHang' | 'TraHang' | 'BaoHanh';

  @ApiProperty({ example: 'HangLoiKhongDungMoTa', description: 'Lý do ngắn gọn' })
  @IsString()
  @MaxLength(30)
  reason: string;

  @ApiPropertyOptional({ example: 'Sản phẩm bị lỗi màn hình ngay từ khi mở hộp...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [Number], example: [12, 13], description: 'Danh sách asset_id ảnh bằng chứng' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  assetIds?: number[];
}
