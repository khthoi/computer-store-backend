import {
  IsInt, IsEnum, IsOptional, IsArray, IsString, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type, Transform, plainToInstance } from 'class-transformer';
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
  @Type(() => Number)
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

  @ApiPropertyOptional({ type: [Number], example: [12, 13], description: 'Danh sách asset_id có sẵn (thường để trống — upload qua images[])' })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.map((v) => Number(v)).filter((n) => Number.isFinite(n));
    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map((v) => Number(v)).filter((n) => Number.isFinite(n)) : [];
      } catch {
        return value.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
      }
    }
    return value;
  })
  @IsArray()
  @IsInt({ each: true })
  assetIds?: number[];

  @ApiPropertyOptional({
    description: 'Danh sách phiên bản sản phẩm + số lượng. JSON string khi gửi multipart, hoặc array khi gửi JSON.',
    example: '[{"variantId":12,"quantity":1}]',
  })
  @IsOptional()
  @Transform(({ value }) => {
    let raw: unknown = value;
    if (typeof value === 'string' && value.trim()) {
      try {
        raw = JSON.parse(value);
      } catch {
        return value;
      }
    }
    if (Array.isArray(raw)) {
      return plainToInstance(ReturnItemDto, raw);
    }
    return raw;
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items?: ReturnItemDto[];
}
