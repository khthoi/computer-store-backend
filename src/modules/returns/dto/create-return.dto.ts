import {
  IsInt, IsString, IsEnum, IsOptional, IsArray, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ReturnItemDto {
  @ApiProperty({ example: 12, description: 'ID phiên bản sản phẩm muốn trả' })
  @IsInt()
  @Min(1)
  variantId: number;

  @ApiProperty({ example: 1, description: 'Số lượng muốn trả' })
  @IsInt()
  @Min(1)
  quantity: number;
}

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

  @ApiPropertyOptional({
    type: [ReturnItemDto],
    description: 'Danh sách phiên bản sản phẩm và số lượng muốn trả/hoàn tiền. Bắt buộc khi requestType = TraHang',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items?: ReturnItemDto[];
}
