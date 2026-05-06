import {
  IsInt, IsEnum, IsOptional, IsArray, IsString, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const RETURN_REASON_CODES = [
  'LoiNhaSanXuat',        // Lỗi từ nhà sản xuất
  'GuiNhamHang',           // Store gửi nhầm hàng
  'HuHongKhiVanChuyen',   // Hư hỏng trong quá trình vận chuyển
  'ThieuPhuKien',          // Thiếu phụ kiện trong hộp
  'KhongDungMoTa',         // Sản phẩm không đúng mô tả
  'DoiYKien',              // Khách đổi ý, không có lỗi sản phẩm
  'KhongTuongThich',       // Không tương thích với thiết bị khách
  'HieuNangKemHon',        // Hiệu năng thực tế kém hơn mô tả
] as const;

export type ReturnReasonCode = typeof RETURN_REASON_CODES[number];

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

  @ApiProperty({
    enum: RETURN_REASON_CODES,
    example: 'LoiNhaSanXuat',
    description: 'Mã lý do chuẩn hóa',
  })
  @IsEnum(RETURN_REASON_CODES)
  reason: ReturnReasonCode;

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
